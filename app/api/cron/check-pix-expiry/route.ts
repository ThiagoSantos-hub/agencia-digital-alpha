import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Desativa empresas no plano Pix (pagamento avulso, sem renovação automática)
// cujo acesso venceu sem uma nova cobrança. Chamado por um workflow n8n
// agendado 1x/dia (mesmo padrão de autenticação de app/api/alerts/check).
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/check-pix-expiry] CRON_SECRET não configurado')
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('companies')
    .update({ active: false, subscription_status: 'pix_expirado' })
    .eq('payment_method', 'pix')
    .eq('active', true)
    .lt('access_expires_at', new Date().toISOString())
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ desativadas: data?.length ?? 0 })
}
