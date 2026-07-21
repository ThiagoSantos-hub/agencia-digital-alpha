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

// Cada usuário começa sem nenhuma nota fixa — o "segundo cérebro" é pessoal
// de cada um, preenchido por ele mesmo (nunca dados de outra pessoa por padrão).
export const DEFAULT_NOTES: BrainNote[] = []

export const DEFAULT_REL: [string, string][] = []

function buildRules(preferredName?: string, workContext?: string): string {
  const tratamento = preferredName?.trim()
    ? `Chame o usuário de "${preferredName.trim()}".`
    : 'Trate o usuário de forma direta e respeitosa, sem inventar um título.'
  const contexto = workContext?.trim()
    ? `\nSobre o usuário e o trabalho dele: ${workContext.trim()}`
    : ''

  return `
Você é Alpha, assistente de IA da Digital Alpha. ${tratamento}
Formal, direto, objetivo. PT-BR. Sem emojis/markdown.
Máximo 1–2 frases. Sem "vou verificar". Só o resultado.
Nunca invente dados do CRM.${contexto}
`.trim()
}

/** Prompt completo (legado / detalhado) */
export function buildSystemPersonaBlock(
  notes: BrainNote[] = DEFAULT_NOTES,
  preferredName?: string,
  workContext?: string
): string {
  const rules = buildRules(preferredName, workContext)
  if (notes.length === 0) return rules

  const lines = notes.map((n) => `- [${AREA[n.area]?.label ?? n.area}] ${n.title}: ${n.body}`)
  return `${rules}

SECOND BRAIN:
${lines.join('\n')}

Se fato novo e duradouro, termine com: [[SAVE:area|titulo|texto]]
area ∈ meta,metas,trabalho,projetos,financas,aprendizado,saude,relacoes`
}

/** Prompt enxuto — menos tokens = LLM responde mais rápido */
export function buildSystemPersonaBlockCompact(
  notes: BrainNote[] = DEFAULT_NOTES,
  preferredName?: string,
  workContext?: string
): string {
  const rules = buildRules(preferredName, workContext)
  if (notes.length === 0) return rules

  const lines = notes.map((n) => `${n.title}: ${n.body}`)
  return `${rules}

CONTEXTO: ${lines.join(' | ')}

Fato novo? Termine com [[SAVE:area|titulo|texto]]`
}
