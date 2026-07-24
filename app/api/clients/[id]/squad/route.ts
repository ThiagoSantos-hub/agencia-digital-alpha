import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildClientMetricsSummary } from '@/lib/clientMetricsSummary'
import { OpenAIProvider } from '@/lib/ai/providers/openai.provider'
import { TRAFFIC_CHIEF, SQUAD_MEMBERS, ALL_SQUAD, findSquadMember } from '@/lib/ai/trafficMastersSquad'

export const dynamic = 'force-dynamic'

const RESPONDER_EM_PORTUGUES =
  'Responda sempre em português do Brasil, mantendo sua personalidade, vocabulário e forma de pensar descritos acima. Seja direto e objetivo.'

// Roteamento automático: uma chamada barata e curta pra escolher o especialista
// certo antes da chamada real que gera a resposta (o usuário também pode pular
// isso escolhendo um specialistId manualmente no corpo da requisição).
async function escolherEspecialista(provider: OpenAIProvider, pergunta: string, resumo: string): Promise<typeof SQUAD_MEMBERS[number] | typeof TRAFFIC_CHIEF> {
  const roster = SQUAD_MEMBERS.map((m) => `${m.id}: ${m.shortDescription}`).join('\n')
  const resposta = await provider.chat({
    messages: [
      {
        role: 'system',
        content: `${TRAFFIC_CHIEF.systemPrompt}\n\nSua única tarefa agora é escolher, entre os especialistas abaixo, qual deve responder a pergunta do usuário. Responda APENAS com o id exato, em uma palavra, sem mais nada.\n\n${roster}`,
      },
      { role: 'user', content: `Pergunta: ${pergunta}\n\nContexto do cliente: ${resumo}` },
    ],
    maxTokens: 20,
    temperature: 0,
  })

  const idEscolhido = resposta.text.trim().toLowerCase().replace(/[^a-z_]/g, '')
  return SQUAD_MEMBERS.find((m) => m.id === idEscolhido) ?? TRAFFIC_CHIEF
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: aiKeys } = await supabase
    .from('personal_ai_keys')
    .select('openai_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!aiKeys?.openai_api_key) {
    return NextResponse.json({ error: 'Conecte sua chave da OpenAI em Integrações antes de falar com o Squad.' }, { status: 403 })
  }

  const { question, specialistId } = await request.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Escreva uma pergunta.' }, { status: 400 })
  }

  const resumo = await buildClientMetricsSummary(supabase, params.id)
  if (resumo === 'Cliente não encontrado.') {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  const provider = new OpenAIProvider(aiKeys.openai_api_key)

  let autoRouted = false
  let especialista = specialistId ? findSquadMember(specialistId) : undefined

  if (!especialista) {
    autoRouted = true
    try {
      especialista = await escolherEspecialista(provider, question, resumo)
    } catch (err) {
      console.error('[squad] erro ao rotear especialista, usando Traffic Chief:', err)
      especialista = TRAFFIC_CHIEF
    }
  }

  try {
    const resposta = await provider.chat({
      messages: [
        { role: 'system', content: `${especialista.systemPrompt}\n\n${RESPONDER_EM_PORTUGUES}` },
        { role: 'user', content: `${question}\n\nContexto do cliente: ${resumo}` },
      ],
      maxTokens: 700,
      temperature: 0.5,
    })

    return NextResponse.json({
      specialist: { id: especialista.id, name: especialista.name, emoji: especialista.emoji },
      content: resposta.text || 'Não foi possível gerar uma resposta agora.',
      autoRouted,
    })
  } catch (err) {
    console.error('[squad] erro ao gerar resposta:', err)
    return NextResponse.json({ error: 'Erro ao consultar o Squad de Tráfego.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    members: ALL_SQUAD.map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, group: m.group })),
  })
}
