// Envio de e-mail via Brevo. Extraído do fetch inline que existia em
// app/api/superadmin/companies/route.ts (usado também pelo webhook do Stripe
// agora) — os outros 2 usos duplicados (collaborators/invite,
// collaborators/update-password) ficam como estão, fora de escopo.

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'

async function sendBrevoEmail(payload: {
  toEmail: string
  toName: string
  subject: string
  htmlContent: string
  senderName: string
}): Promise<{ ok: boolean }> {
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) return { ok: false }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({
        sender: { name: payload.senderName, email: BREVO_SENDER_EMAIL },
        to: [{ email: payload.toEmail, name: payload.toName }],
        replyTo: { name: payload.senderName, email: BREVO_SENDER_EMAIL },
        subject: payload.subject,
        htmlContent: payload.htmlContent,
      }),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function sendWelcomeEmail(params: {
  companyName: string
  adminName: string
  adminEmail: string
  tempPassword: string
}): Promise<{ ok: boolean }> {
  const { companyName, adminName, adminEmail, tempPassword } = params
  return sendBrevoEmail({
    toEmail: adminEmail,
    toName: adminName,
    senderName: companyName,
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
            <p style="margin: 10px 0 0 0;"><strong>Senha temporária:</strong> ${tempPassword}</p>
          </div>
          <p><a href="${APP_URL}/login" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acessar o Sistema</a></p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Recomendamos trocar sua senha após o primeiro acesso.</p>
        </div>
      </body></html>
    `,
  })
}

// Alerta interno pro dono da plataforma -- usado quando um pagamento no Stripe
// foi confirmado mas o provisionamento da empresa falhou (ex: corrida rara de
// e-mail duplicado), pra ele resolver na mão.
export async function sendInternalAlert(params: { subject: string; message: string }): Promise<{ ok: boolean }> {
  const alertEmail = process.env.PLATFORM_ALERT_EMAIL
  if (!alertEmail) return { ok: false }
  return sendBrevoEmail({
    toEmail: alertEmail,
    toName: 'Digital Alpha',
    senderName: 'Digital Alpha - Alertas',
    subject: params.subject,
    htmlContent: `<p style="font-family: sans-serif;">${params.message}</p>`,
  })
}
