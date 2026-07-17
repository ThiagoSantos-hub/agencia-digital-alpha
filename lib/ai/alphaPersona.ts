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

export const DEFAULT_NOTES: BrainNote[] = [
  { id: 'n-voce', area: 'meta', title: 'Thiago', body: 'Thiago Santos, 36 anos, Fortaleza-CE. Tráfego, CRM, treinamento, sistemas. 3 filhos.' },
  { id: 'n-meta-3m', area: 'metas', title: '3 meses', body: 'SaaS Digital Alpha vendendo. Meta ~R$ 15 mil.' },
  { id: 'n-meta-6m', area: 'metas', title: '6 meses', body: 'Faturar ~R$ 50 mil.' },
  { id: 'n-meta-3a', area: 'metas', title: '3 anos', body: 'Faturar ~R$ 1 mi/ano.' },
  { id: 'n-carreira', area: 'trabalho', title: 'CEO Alpha', body: 'CEO Digital Alpha. Tráfego, CRM, treinamento. Foco 3 meses.' },
  { id: 'n-proj-alpha', area: 'projetos', title: 'Digital Alpha', body: 'Sistema para agências gerenciarem clientes e equipe.' },
  { id: 'n-proj-noivos', area: 'projetos', title: 'Noivos', body: 'Sites para noivos organizarem o casamento.' },
  { id: 'n-proj-trafego', area: 'projetos', title: 'Tráfego', body: 'Tráfego pago de 20+ empresas.' },
  { id: 'n-proj-ebook', area: 'projetos', title: 'Ebook', body: 'Ebook para pregadores.' },
  { id: 'n-proj-sermao', area: 'projetos', title: 'Sermão', body: 'Site Elaborador de Sermão.' },
  { id: 'n-proj-discipulo', area: 'projetos', title: 'Discípulo', body: 'Projeto Discípulo.' },
  { id: 'n-financas', area: 'financas', title: 'Metas $', body: '15k/3m · 50k/6m · 1mi/ano.' },
  { id: 'n-aprende', area: 'aprendizado', title: 'Estudos', body: 'IA, Bíblia, finanças, vendas.' },
  { id: 'n-saude', area: 'saude', title: 'Rotina', body: 'Quer treinar e regular sono/alimentação.' },
  { id: 'n-rayana', area: 'relacoes', title: 'Rayana', body: 'Noiva do diretor.' },
  { id: 'n-naylla', area: 'relacoes', title: 'Naylla', body: 'Filha Naylla Thiele (~14, 15 em ago).' },
  { id: 'n-theo', area: 'relacoes', title: 'Theo', body: 'Filho Theo Lucas, 11 anos.' },
  { id: 'n-thaylon', area: 'relacoes', title: 'Thaylon', body: 'Filho Thaylon Ravi, 8 anos.' },
  { id: 'n-ricardo', area: 'relacoes', title: 'Ricardo', body: 'Amigo e colaborador. Não sócio.' },
]

export const DEFAULT_REL: [string, string][] = [
  ['n-voce', 'n-carreira'],
  ['n-voce', 'n-rayana'],
  ['n-meta-3m', 'n-proj-alpha'],
  ['n-meta-3m', 'n-financas'],
  ['n-carreira', 'n-proj-alpha'],
  ['n-ricardo', 'n-carreira'],
]

const RULES = `
Você é Alpha (Digital Alpha). Chame o usuário de "diretor".
Formal, seco, objetivo. PT-BR. Sem emojis/markdown.
Máximo 1–2 frases. Sem "vou verificar". Só o resultado.
Nunca invente dados do CRM.
`.trim()

/** Prompt completo (legado / detalhado) */
export function buildSystemPersonaBlock(notes: BrainNote[] = DEFAULT_NOTES): string {
  const lines = notes.map((n) => `- [${AREA[n.area]?.label ?? n.area}] ${n.title}: ${n.body}`)
  return `${RULES}

SECOND BRAIN:
${lines.join('\n')}

Se fato novo e duradouro, termine com: [[SAVE:area|titulo|texto]]
area ∈ meta,metas,trabalho,projetos,financas,aprendizado,saude,relacoes`
}

/** Prompt enxuto — menos tokens = LLM responde mais rápido */
export function buildSystemPersonaBlockCompact(notes: BrainNote[] = DEFAULT_NOTES): string {
  const lines = notes.map((n) => `${n.title}: ${n.body}`)
  return `${RULES}

CONTEXTO: ${lines.join(' | ')}

Fato novo? Termine com [[SAVE:area|titulo|texto]]`
}
