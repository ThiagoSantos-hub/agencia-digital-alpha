import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { alphaAI } from '@/lib/ai/AIService'
import { buildClientMetricsSummary } from '@/lib/clientMetricsSummary'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('client_ai_analyses')
    .select('content, generated_at')
    .eq('client_id', params.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

// Mesma exigência de app/api/ai/route.ts: cada pessoa usa a própria chave da
// OpenAI, sem custo compartilhado surpresa pro Thiago.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: aiKeys } = await supabase
    .from('personal_ai_keys')
    .select('openai_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!aiKeys?.openai_api_key) {
    return NextResponse.json({ error: 'Conecte sua chave da OpenAI em Integrações antes de gerar o diagnóstico.' }, { status: 403 })
  }

  const resumo = await buildClientMetricsSummary(supabase, params.id)
  if (resumo === 'Cliente não encontrado.') {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const prompt = `Gere um diagnóstico curto e objetivo (máximo 4 parágrafos) em português sobre a performance deste cliente de agência de marketing, com base nestes dados: ${resumo} Estruture em: pontos fortes, pontos de atenção e uma sugestão prática do que fazer a seguir. Seja direto, sem enrolação, como se estivesse explicando pro dono da agência. Se os dados forem insuficientes (tudo zerado), diga isso claramente em vez de inventar números.`

  let content: string
  try {
    const resposta = await alphaAI.chat(aiKeys.openai_api_key, [{ role: 'user', content: prompt }], undefined, {
      maxTokens: 500,
      temperature: 0.4,
      compact: true,
    })
    content = resposta.text || 'Não foi possível gerar o diagnóstico agora.'
  } catch (err) {
    console.error('[ai-analysis] erro ao gerar diagnóstico:', err)
    return NextResponse.json({ error: 'Erro ao gerar diagnóstico com IA.' }, { status: 500 })
  }

  const generated_at = new Date().toISOString()
  await supabaseAdmin.from('client_ai_analyses').insert({
    client_id: params.id,
    content,
    generated_by: user.id,
    generated_at,
  })

  return NextResponse.json({ content, generated_at })
}
