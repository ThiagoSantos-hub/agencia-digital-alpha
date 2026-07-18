import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Resolve a empresa de quem está convidando — sem isso o colaborador novo
    // nasceria com company_id nulo e ficaria invisível pra própria empresa (RLS).
    const session = createServerClient()
    const { data: { user: callingUser } } = await session.auth.getUser()
    if (!callingUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { data: callingProfile } = await session
      .from('profiles')
      .select('company_id, role')
      .eq('id', callingUser.id)
      .single()
    if (!callingProfile || callingProfile.role === 'collaborator') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const companyId = callingProfile.company_id

    const { name, email, password, cargo } = await request.json()

    let userId: string

    // 1. Verificar se usuário já existe no Supabase Auth
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Erro ao listar usuários Auth:', listError)
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }

    const found = existingUsers?.users?.find(u => u.email === email)

    if (found) {
      // Usuário já existe, apenas capturamos o ID
      userId = found.id
      console.log('✅ Usuário já existente no Auth:', userId)
    } else {
      // 2. Criar novo usuário no Supabase Auth usando o cliente admin
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'collaborator', company_id: companyId }
      })

      if (authError) {
        console.error('❌ Erro ao criar usuário no Auth:', authError)
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
      userId = authData.user.id
      console.log('✅ Usuário criado no Auth:', userId)
    }

    // 3. Criar registro na tabela 'profiles' para que o sistema reconheça o papel (role)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        name: name,
        role: 'collaborator',
        company_id: companyId
      })

    if (profileError) {
      console.error('❌ Erro ao criar registro na tabela profiles:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 4. Vincular user_id ao registro do colaborador
    const { error: updateError } = await supabaseAdmin
      .from('collaborators')
      .update({ user_id: userId })
      .eq('email', email)

    if (updateError) {
      console.error('❌ Erro ao vincular user_id na tabela collaborators:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // 5. Enviar email via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL

    if (!brevoApiKey || !brevoSenderEmail) {
      console.error('❌ Erro: Configurações do Brevo ausentes (BREVO_API_KEY ou BREVO_SENDER_EMAIL)')
      return NextResponse.json({ 
        error: 'Configuração de e-mail incompleta no servidor.',
        missing: !brevoApiKey ? 'BREVO_API_KEY' : 'BREVO_SENDER_EMAIL'
      }, { status: 500 })
    }

    console.log('📧 Enviando email via Brevo para:', email, 'Remetente:', brevoSenderEmail)
    
    const brevoPayload = {
        sender: { name: 'Digital Alpha', email: brevoSenderEmail },
        to: [{ email, name }],
        replyTo: { name: 'Digital Alpha', email: brevoSenderEmail },
      subject: 'Seu acesso ao sistema foi criado!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; background-color: #ffffff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            <h2 style="color: #10b981;">Olá, ${name}!</h2>
            <p>Seu acesso ao sistema da Agência Digital Alpha foi criado com sucesso.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>E-mail:</strong> ${email}</p>
              <p style="margin: 10px 0 0 0;"><strong>Senha temporária:</strong> ${password}</p>
            </div>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'}/login" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar o Sistema</a></p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 12px;">Recomendamos trocar sua senha após o primeiro acesso para sua segurança.</p>
          </div>
        </body>
        </html>
      `
    }

    console.log('📧 Payload do Brevo preparado. Remetente:', brevoSenderEmail, 'Destinatário:', email)

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(brevoPayload)
    })

    const brevoBody = await brevoRes.json()
    console.log('📧 Resposta Brevo:', brevoRes.status, JSON.stringify(brevoBody))

    if (!brevoRes.ok) {
      console.error('❌ Erro Brevo:', brevoBody)
      return NextResponse.json({ error: 'Erro ao enviar email via Brevo', details: brevoBody }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro interno na rota de convite:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
