import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireSuperAdmin() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return {}
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const { companyName, companySlug, adminName, adminEmail, adminPassword } = await request.json()

    if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName, slug: companySlug })
      .select()
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: companyError?.message || 'Erro ao criar empresa.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName, role: 'admin', company_id: company.id },
    })

    if (authError || !authData.user) {
      // Rollback: sem admin, a empresa fica órfã — remove pra permitir tentar de novo.
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: authError?.message || 'Erro ao criar usuário admin.' }, { status: 400 })
    }

    await supabaseAdmin
      .from('profiles')
      .upsert({ id: authData.user.id, email: adminEmail, name: adminName, role: 'admin', company_id: company.id, must_change_password: true })

    // As rotas de assinatura eletrônica só fazem UPDATE (não upsert) em integrations,
    // então toda empresa nova precisa nascer com essas linhas já existindo (desconectadas),
    // senão "conectar" o Autentique/Assinafy pela primeira vez falha silenciosamente.
    await supabaseAdmin.from('integrations').insert([
      { company_id: company.id, type: 'autentique', label: 'Autentique', status: 'disconnected' },
      { company_id: company.id, type: 'assinafy', label: 'Assinafy', status: 'disconnected' },
    ])

    const brevoApiKey = process.env.BREVO_API_KEY
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL

    if (brevoApiKey && brevoSenderEmail) {
      const brevoPayload = {
        sender: { name: companyName, email: brevoSenderEmail },
        to: [{ email: adminEmail, name: adminName }],
        replyTo: { name: companyName, email: brevoSenderEmail },
        subject: `Seu acesso ao ${companyName} foi criado!`,
        htmlContent: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; background-color: #ffffff; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
              <h2 style="color: #10b981;">Olá, ${adminName}!</h2>
              <p>Seu acesso à plataforma ${companyName} foi criado com sucesso.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>E-mail:</strong> ${adminEmail}</p>
                <p style="margin: 10px 0 0 0;"><strong>Senha temporária:</strong> ${adminPassword}</p>
              </div>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'}/login" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar o Sistema</a></p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Recomendamos trocar sua senha após o primeiro acesso.</p>
            </div>
          </body></html>
        `,
      }

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
        body: JSON.stringify(brevoPayload),
      })
    }

    return NextResponse.json({ success: true, company })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
