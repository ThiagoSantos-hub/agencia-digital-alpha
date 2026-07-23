import crypto from 'crypto'

// Token curto assinado (HMAC) que carrega o facebook_user_id verificado entre
// o callback do login público com Facebook (app/api/public/facebook-login/callback)
// e o cadastro em si (app/api/public/signup) — sem sessão do Supabase entre os
// dois passos, então não dá pra guardar isso em auth.uid(). Usa o mesmo
// META_APP_SECRET já configurado pro Meta Ads (é um segredo só do servidor,
// não precisa de env var nova).
const SECRET = process.env.META_APP_SECRET || ''
const TTL_MS = 10 * 60 * 1000 // 10 minutos: tempo de sobra pra terminar o cadastro sem reabrir o login

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function signFacebookToken(facebookUserId: string): string {
  const payload = `${facebookUserId}.${Date.now() + TTL_MS}`
  const payloadB64 = Buffer.from(payload).toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

export function verifyFacebookToken(token: string): { facebookUserId: string } | null {
  if (!SECRET) return null
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null
  if (sign(payloadB64) !== signature) return null

  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  const [facebookUserId, expiresAtStr] = payload.split('.')
  const expiresAt = Number(expiresAtStr)
  if (!facebookUserId || !expiresAt || Date.now() > expiresAt) return null

  return { facebookUserId }
}
