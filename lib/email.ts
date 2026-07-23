// Envio de e-mail via Brevo. Extraído do fetch inline que existia em
// app/api/superadmin/companies/route.ts (usado também pelo webhook do Stripe
// agora). Os outros 2 usos duplicados (collaborators/invite,
// collaborators/update-password) ficam como estão, fora de escopo.
import { getPlanById, type Plan, type PlanRow } from './plans'

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

function planDetalhesHtml(planRow: PlanRow | null, paymentMethod: 'card' | 'pix' | null, trialDays: number): string {
  if (!planRow) return ''

  const preco = paymentMethod === 'pix' ? planRow.price_brl * 1.1 : planRow.price_brl
  const limiteTexto = planRow.client_limit === null ? 'Clientes ilimitados' : `Até ${planRow.client_limit} clientes cadastrados`

  const cobrancaTexto = planRow.is_free
    ? 'Plano gratuito, sem cobrança nenhuma.'
    : paymentMethod === 'pix'
      ? 'Pagamento único via Pix, válido por 30 dias. Para continuar usando depois desse prazo, é só pagar de novo dentro do sistema, em "Assinatura".'
      : trialDays > 0
        ? `Você está com ${trialDays} dias de teste grátis. Depois desse período, a cobrança de R$ ${preco.toFixed(2).replace('.', ',')} por mês começa automaticamente no cartão cadastrado.`
        : `Assinatura mensal recorrente de R$ ${preco.toFixed(2).replace('.', ',')}, cobrada automaticamente todo mês no cartão cadastrado.`

  return `
    <table role="presentation" width="100%" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #065f46;">Plano ${planRow.name}</p>
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">${limiteTexto}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;">${cobrancaTexto}</p>
        </td>
      </tr>
    </table>
  `
}

export async function sendWelcomeEmail(params: {
  companyName: string
  adminName: string
  adminEmail: string
  tempPassword: string
  plan?: Plan | null
  paymentMethod?: 'card' | 'pix' | null
  trialDays?: number
}): Promise<{ ok: boolean }> {
  const { companyName, adminName, adminEmail, tempPassword, plan = null, paymentMethod = null, trialDays = 0 } = params
  const planRow = await getPlanById(plan)

  return sendBrevoEmail({
    toEmail: adminEmail,
    toName: adminName,
    senderName: 'Digital Alpha',
    subject: `Seu acesso à Digital Alpha foi criado`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 32px 16px;">
        <table role="presentation" width="100%" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <tr>
            <td style="background: #111827; padding: 24px 32px;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 800;">DIGITAL <span style="color: #34d399;">ALPHA</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">Olá, ${adminName}!</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                O acesso da empresa <strong>${companyName}</strong> à plataforma foi criado com sucesso.
              </p>

              ${planDetalhesHtml(planRow, paymentMethod, trialDays)}

              <table role="presentation" width="100%" style="background: #f3f4f6; border-radius: 10px; margin: 8px 0 24px 0;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">E-mail de acesso</p>
                    <p style="margin: 0 0 14px 0; font-size: 14px; color: #111827; font-weight: 600;">${adminEmail}</p>
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">Senha temporária</p>
                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 600; font-family: monospace;">${tempPassword}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation">
                <tr>
                  <td style="border-radius: 10px; background: #10b981;">
                    <a href="${APP_URL}/login" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none;">Acessar o sistema</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                No primeiro acesso, o sistema vai pedir pra você trocar essa senha temporária por uma definitiva.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">Se você não fez essa compra, cancele imediatamente entrando em contato com nosso suporte.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Suporte: (85) 99230-7273 . thiagogestorbm@gmail.com</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

export async function sendPasswordResetEmail(params: {
  toEmail: string
  toName: string
  token: string
  motivo: 'esqueci' | 'troca_no_painel'
}): Promise<{ ok: boolean }> {
  const link = `${APP_URL}/redefinir-senha?token=${params.token}`
  const titulo = params.motivo === 'esqueci' ? 'Redefinir sua senha' : 'Confirmar troca de senha'
  const explicacao = params.motivo === 'esqueci'
    ? 'Recebemos um pedido para redefinir a senha da sua conta.'
    : 'Você pediu pra trocar sua senha dentro do sistema. Por segurança, confirme clicando no botão abaixo.'

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.toName,
    senderName: 'Digital Alpha',
    subject: `Digital Alpha: ${titulo}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 32px 16px;">
        <table role="presentation" width="100%" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <tr>
            <td style="background: #111827; padding: 24px 32px;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 800;">DIGITAL <span style="color: #34d399;">ALPHA</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">${titulo}</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.6;">${explicacao}</p>

              <table role="presentation">
                <tr>
                  <td style="border-radius: 10px; background: #10b981;">
                    <a href="${link}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none;">${params.motivo === 'esqueci' ? 'Redefinir senha' : 'Confirmar troca'}</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                Esse link expira em 1 hora. Se você não pediu isso, ignore este e-mail e sua senha continua a mesma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Suporte: (85) 99230-7273 . thiagogestorbm@gmail.com</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

// Alerta interno pro dono da plataforma, usado quando um pagamento no Stripe
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

// Avisa o assinante da empresa (contract_signer_email) quando um cliente preenche
// o formulário público de contrato, e de novo quando o contrato é assinado por
// todo mundo — hoje nenhum dos dois momentos gerava aviso nenhum pro admin.
export async function sendContractNotification(params: {
  toEmail: string
  toName: string
  clientName: string
  event: 'preenchido' | 'assinado'
}): Promise<{ ok: boolean }> {
  const subject = params.event === 'preenchido'
    ? `${params.clientName} preencheu um contrato`
    : `Contrato com ${params.clientName} foi assinado`

  const message = params.event === 'preenchido'
    ? `${params.clientName} acabou de preencher os dados do contrato e ele foi enviado para assinatura eletrônica. Você recebe outro aviso assim que todas as partes assinarem.`
    : `O contrato com ${params.clientName} foi assinado por todas as partes. O PDF assinado já está disponível dentro do sistema, em Contratos.`

  return sendBrevoEmail({
    toEmail: params.toEmail,
    toName: params.toName,
    senderName: 'Digital Alpha',
    subject,
    htmlContent: `<p style="font-family: sans-serif;">${message}</p>`,
  })
}
