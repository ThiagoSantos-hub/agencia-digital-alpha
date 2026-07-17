// lib/ai/alphaPersona.ts
// Personalidade e Second Brain da Alpha — dados da entrevista (Thiago Santos)

export const ALPHA_CONFIG = {
  name: 'Alpha',
  address: 'diretor',
  themeColor: '#1A56DB',
  persona: 'formal_britanico' as const,
  wakeWord: 'alpha',
  voiceGender: 'masculina' as const,
}

export type NoteArea =
  | 'meta'
  | 'metas'
  | 'trabalho'
  | 'projetos'
  | 'financas'
  | 'aprendizado'
  | 'saude'
  | 'relacoes'

export const AREA: Record<NoteArea, { label: string; color: string }> = {
  meta:        { label: 'Você',         color: '#8a90a6' },
  metas:       { label: 'Metas',        color: '#fbbf24' },
  trabalho:    { label: 'Carreira',     color: '#ff5547' },
  projetos:    { label: 'Projetos',     color: '#8b7cff' },
  financas:    { label: 'Finanças',     color: '#f7931a' },
  aprendizado: { label: 'Aprendizado',  color: '#2dd4ff' },
  saude:       { label: 'Saúde',        color: '#10b981' },
  relacoes:    { label: 'Relações',     color: '#ec4899' },
}

export interface BrainNote {
  id: string
  area: NoteArea
  title: string
  body: string
}

/** Notas iniciais embutidas da entrevista */
export const DEFAULT_NOTES: BrainNote[] = [
  {
    id: 'n-voce',
    area: 'meta',
    title: 'Thiago',
    body: 'Thiago Santos, 36 anos, mora em Fortaleza-CE. Gestor de tráfego pago, vende CRM, dá treinamento comercial e constrói sistemas e sites. Tem três filhos.',
  },
  {
    id: 'n-meta-3m',
    area: 'metas',
    title: '3 meses',
    body: 'Colocar o sistema Digital Alpha (SaaS) funcionando e vendendo. Meta de faturamento ~R$ 15 mil.',
  },
  {
    id: 'n-meta-6m',
    area: 'metas',
    title: '6 meses',
    body: 'Faturar em torno de R$ 50 mil.',
  },
  {
    id: 'n-meta-3a',
    area: 'metas',
    title: '3 anos',
    body: 'Faturar no mínimo R$ 1 milhão por ano com a empresa e o SaaS.',
  },
  {
    id: 'n-carreira',
    area: 'trabalho',
    title: 'CEO Alpha',
    body: 'CEO e dono da Digital Alpha. Atua como gestor de tráfego, vendedor de CRM (mensalidade), treinamento comercial. Foco: concretizar as metas dos próximos 3 meses.',
  },
  {
    id: 'n-proj-alpha',
    area: 'projetos',
    title: 'Digital Alpha',
    body: 'Sistema de marketing digital para agências gerenciarem clientes, equipe e automação.',
  },
  {
    id: 'n-proj-noivos',
    area: 'projetos',
    title: 'Noivos',
    body: 'Sistema de sites para noivos organizarem o casamento na palma da mão.',
  },
  {
    id: 'n-proj-trafego',
    area: 'projetos',
    title: 'Tráfego',
    body: 'Gerencia tráfego pago de mais de 20 empresas.',
  },
  {
    id: 'n-proj-ebook',
    area: 'projetos',
    title: 'Ebook',
    body: 'Ebook para pessoas que pregam.',
  },
  {
    id: 'n-proj-sermao',
    area: 'projetos',
    title: 'Sermão',
    body: 'Site Elaborador de Sermão.',
  },
  {
    id: 'n-proj-discipulo',
    area: 'projetos',
    title: 'Discípulo',
    body: 'Site/projeto Discípulo.',
  },
  {
    id: 'n-financas',
    area: 'financas',
    title: 'Metas $',
    body: '3 meses: ~R$ 15 mil líquido. 6 meses: ~R$ 50 mil. Longo prazo: ~R$ 1 mi/ano.',
  },
  {
    id: 'n-aprende',
    area: 'aprendizado',
    title: 'Estudos',
    body: 'Estuda IA com intensidade. Lê Bíblia, livros de finanças e de vendas.',
  },
  {
    id: 'n-saude',
    area: 'saude',
    title: 'Rotina',
    body: 'Hoje não treina. Quer passar a malhar, regular sono e alimentação em breve.',
  },
  {
    id: 'n-rayana',
    area: 'relacoes',
    title: 'Rayana',
    body: 'Noiva do diretor (Rayana com Y).',
  },
  {
    id: 'n-naylla',
    area: 'relacoes',
    title: 'Naylla',
    body: 'Filha Naylla Thiele, cerca de 14 anos (faz 15 em agosto).',
  },
  {
    id: 'n-theo',
    area: 'relacoes',
    title: 'Theo',
    body: 'Filho Theo Lucas, 11 anos.',
  },
  {
    id: 'n-thaylon',
    area: 'relacoes',
    title: 'Thaylon',
    body: 'Filho Thaylon Ravi, 8 anos.',
  },
  {
    id: 'n-ricardo',
    area: 'relacoes',
    title: 'Ricardo',
    body: 'Amigo e colaborador próximo. Não é sócio.',
  },
]

/** Ligações densas — metas como hub */
export const DEFAULT_REL: [string, string][] = [
  ['n-voce', 'n-carreira'],
  ['n-voce', 'n-rayana'],
  ['n-voce', 'n-naylla'],
  ['n-voce', 'n-theo'],
  ['n-voce', 'n-thaylon'],
  ['n-meta-3m', 'n-meta-6m'],
  ['n-meta-6m', 'n-meta-3a'],
  ['n-meta-3m', 'n-proj-alpha'],
  ['n-meta-3m', 'n-financas'],
  ['n-meta-3m', 'n-carreira'],
  ['n-meta-6m', 'n-financas'],
  ['n-meta-3a', 'n-financas'],
  ['n-carreira', 'n-proj-alpha'],
  ['n-carreira', 'n-proj-trafego'],
  ['n-proj-alpha', 'n-financas'],
  ['n-proj-noivos', 'n-meta-3m'],
  ['n-proj-ebook', 'n-proj-sermao'],
  ['n-proj-sermao', 'n-proj-discipulo'],
  ['n-aprende', 'n-proj-alpha'],
  ['n-aprende', 'n-carreira'],
  ['n-saude', 'n-voce'],
  ['n-ricardo', 'n-carreira'],
  ['n-ricardo', 'n-proj-alpha'],
]

export function buildSystemPersonaBlock(notes: BrainNote[] = DEFAULT_NOTES): string {
  const { name, address, persona } = ALPHA_CONFIG
  const personaDesc =
    persona === 'formal_britanico'
      ? 'formal, britânico, estilo mordomo leal e preciso — educado, objetivo e sóbrio'
      : persona

  const byArea: Record<string, BrainNote[]> = {}
  for (const n of notes) {
    if (!byArea[n.area]) byArea[n.area] = []
    byArea[n.area].push(n)
  }

  const brainLines: string[] = []
  for (const [areaKey, list] of Object.entries(byArea)) {
    const label = AREA[areaKey as NoteArea]?.label ?? areaKey
    brainLines.push(`### ${label}`)
    for (const n of list) {
      brainLines.push(`- ${n.title}: ${n.body}`)
    }
  }

  return `
IDENTIDADE
Você é ${name}, assistente de IA da Digital Alpha.
Trate o usuário sempre como "${address}".
Personalidade: ${personaDesc}.
Responda em português do Brasil, de forma falada e curta (2 a 4 frases), sem emojis e sem markdown.
Você tem acesso ao CRM da agência (clientes, tarefas, campanhas, financeiro).
Nunca invente dados do CRM — use as ferramentas quando precisar.

SECOND BRAIN DO DIRETOR (contexto pessoal — use para personalizar)
${brainLines.join('\n')}

PROTOCOLO DE MEMÓRIA VIVA
Se o diretor revelar algo novo e duradouro sobre a vida, negócios ou família,
TERMINE a resposta com uma linha no formato EXATO:
[[SAVE:area|titulo|texto]]
onde area ∈ meta, metas, trabalho, projetos, financas, aprendizado, saude, relacoes.
Inclua [[SAVE:...]] somente quando houver fato realmente novo. Não mencione o protocolo em voz alta.
`.trim()
}
