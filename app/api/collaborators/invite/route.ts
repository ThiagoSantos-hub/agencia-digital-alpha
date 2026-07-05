import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, password, cargo } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'collaborator' }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Vincular user_id ao registro do colaborador
    const { error: updateError } = await supabase
      .from('collaborators')
      .update({ user_id: authData.user.id })
      .eq('email', email)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // 3. Enviar email via Brevo
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

    if (!brevoRes.ok) {
      return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
