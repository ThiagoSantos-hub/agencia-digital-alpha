import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { OpenAIProvider } from '@/lib/ai/providers/openai.provider'
import type { Message } from '@/lib/ai/types'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Você é a IA de Suporte da Digital Alpha, um sistema (SaaS) pra agências de marketing gerenciarem clientes, campanhas de tráfego pago, redes sociais, financeiro, contratos, equipe e relatórios.

Seu único trabalho é tirar dúvidas sobre COMO USAR o sistema (é um FAQ inteligente). Você NÃO tem acesso aos dados de nenhuma empresa (clientes, financeiro, campanhas, contratos) — isso é feito pela Alpha AI pessoal de cada usuário, dentro do sistema, não por você. Se perguntarem algo específico da conta deles (ex: "quantos clientes eu tenho", "meu financeiro está certo?"), explique que você não tem acesso a esses dados e sugira usar a Alpha AI (menu "Alpha AI") ou verificar direto na tela correspondente.

Módulos do sistema, pra te ajudar a responder:
- Dashboard: resumo geral da agência (clientes ativos, campanhas, relatórios, alertas, tarefas, ranking de colaboradores).
- Clientes: cadastro e gestão dos clientes da agência.
- Campanhas: campanhas de tráfego pago (Meta Ads), com métricas.
- Relatórios: geração e envio de relatórios por WhatsApp ou e-mail, com opção de IA.
- Alertas: avisos automáticos quando algo precisa de atenção nas campanhas.
- Agenda: reuniões (com Google Agenda/Meet), e-mails (Gmail), cada pessoa conecta sua própria conta Google.
- Tarefas e Checklists: gestão de tarefas e checklists recorrentes.
- Contratos: criação de modelos de contrato, geração de link público pro cliente preencher, assinatura eletrônica (Autentique/Assinafy).
- Financeiro: contas a pagar/receber da agência e dos clientes, incluindo salário de colaboradores.
- Colaboradores: cadastro da equipe, permissões, salário.
- Alpha AI: assistente de IA pessoal (texto e voz), cada usuário conecta sua própria chave da OpenAI (e opcionalmente ElevenLabs) em Integrações — o custo é do usuário, não da Digital Alpha.
- Integrações: conexões OAuth (Meta Ads, Google), WhatsApp, e as chaves pessoais de IA.
- Assinatura: status do plano e pagamento da empresa (cartão ou Pix).

Responda em português, de forma curta e direta. Se não souber a resposta ou for algo fora do sistema, sugira contato com o suporte pelo WhatsApp (85) 9 9230-7273.`

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Suporte por IA indisponível no momento.' }, { status: 503 })
  }

  const { messages } = await request.json() as { messages: { role: 'user' | 'assistant'; content: string }[] }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })
  }

  const provider = new OpenAIProvider(process.env.OPENAI_API_KEY, 'gpt-4o-mini')

  const chatMessages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const response = await provider.chat({ messages: chatMessages, maxTokens: 500, temperature: 0.4 })
    return NextResponse.json({ text: response.text })
  } catch (error: unknown) {
    console.error('Erro no chat de suporte:', error)
    return NextResponse.json({ error: 'Erro ao gerar resposta.' }, { status: 500 })
  }
}
