import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
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
        user_metadata: { name, role: 'collaborator' }
      })

      if (authError) {
        console.error('❌ Erro ao criar usuário no Auth:', authError)
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
      userId = authData.user.id
      console.log('✅ Usuário criado no Auth:', userId)
    }

    // 3. Vincular user_id ao registro do colaborador
    const { error: updateError } = await supabaseAdmin
      .from('collaborators')
      .update({ user_id: userId })
      .eq('email', email)

    if (updateError) {
      console.error('❌ Erro ao vincular user_id na tabela collaborators:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // 4. Enviar email via Brevo
    console.log('📧 Enviando email via Brevo para:', email)
    
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!
      },
      body: JSON.stringify({
        sender: { name: 'Agência Digital Alpha', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email, name }],
        subject: 'Seu acesso ao sistema foi criado!',
        htmlContent: `
          <h2>Olá, ${name}!</h2>
          <p>Seu acesso ao sistema da Agência Digital Alpha foi criado.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Senha:</strong> ${password}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Acessar o Sistema</a></p>
          <p style="color:#999;font-size:12px;">Recomendamos trocar sua senha após o primeiro acesso.</p>
        `
      })
    })

    const brevoBody = await brevoRes.json()
    console.log('📧 Resposta Brevo:', brevoRes.status, JSON.stringify(brevoBody))

    if (!brevoRes.ok) {
      console.error('❌ Erro Brevo:', brevoBody)
      return NextResponse.json({ error: 'Erro ao enviar email', details: brevoBody }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro interno na rota de convite:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
