import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hora

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

  await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  })

  return token
}

export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | { error: string }> {
  const { data } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) return { error: 'Link inválido ou já utilizado.' }
  if (data.used_at) return { error: 'Este link já foi utilizado.' }
  if (new Date(data.expires_at) < new Date()) return { error: 'Este link expirou. Solicite um novo.' }

  await supabaseAdmin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { userId: data.user_id }
}

export { supabaseAdmin as passwordResetSupabaseAdmin }
