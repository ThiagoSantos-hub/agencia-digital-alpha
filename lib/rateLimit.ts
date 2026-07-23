import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pega o IP de quem chamou, considerando que a Vercel roda atrás de proxy
// (o IP de verdade vem em x-forwarded-for, o primeiro da lista).
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// Rate limit simples por janela fixa (não é "sliding window", mas é
// suficiente pra barrar abuso óbvio sem precisar de Redis). Em caso de erro
// na própria checagem (banco fora do ar, etc.), libera a requisição. Rate
// limit quebrado não pode ser motivo pra derrubar o sistema inteiro.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString()

  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_key: key,
    p_window_start: windowStart,
  })

  if (error) {
    console.error('[rateLimit] falha ao checar rate limit:', error.message)
    return true
  }

  return (data as number) <= limit
}
