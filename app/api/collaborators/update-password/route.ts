import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
    }

    // 1. Buscar o usuário pelo email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Erro ao listar usuários Auth:', listError)
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }

    const user = existingUsers?.users?.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const userId = user.id

    // 2. Atualizar senha no Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password
    })

    if (updateError) {
      console.error('❌ Erro ao atualizar senha:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('✅ Senha atualizada para:', email)

    // 3. Enviar email de confirmação via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL

    if (!brevoApiKey || !brevoSenderEmail) {
      console.error('❌ Erro: Configurações do Brevo ausentes')
      return NextResponse.json({ success: true, message: 'Senha atualizada (email não enviado - Brevo não configurado)' })
    }

    const brevoPayload = {
      sender: { name: 'Digital Alpha', email: brevoSenderEmail },
      to: [{ email, name: name || email }],
      replyTo: { name: 'Digital Alpha', email: brevoSenderEmail },
      subject: 'Sua senha foi atualizada!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: sans-serif; background-color: #ffffff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            <h2 style="color: #10b981;">Olá, ${name || email}!</h2>
            <p>Sua senha no sistema da Agência Digital Alpha foi atualizada.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>E-mail:</strong> ${email}</p>
              <p style="margin: 10px 0 0 0;"><strong>Nova senha:</strong> ${password}</p>
            </div>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'}/login" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar o Sistema</a></p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 12px;">Recomendamos trocar sua senha após o primeiro acesso para sua segurança.</p>
          </div>
        </body>
        </html>
      `
    }

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
      return NextResponse.json({ success: true, message: 'Senha atualizada (email não enviado)' })
    }

    return NextResponse.json({ success: true, message: 'Senha atualizada e email enviado!' })
  } catch (error: any) {
    console.error('❌ Erro interno na rota de atualização de senha:', error)
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
