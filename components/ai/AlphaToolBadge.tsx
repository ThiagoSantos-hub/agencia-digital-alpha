// components/ai/AlphaToolBadge.tsx
// Badge que aparece quando a Alpha usou uma ferramenta do CRM

interface AlphaToolBadgeProps {
  toolName: string
}

const TOOL_LABELS: Record<string, string> = {
  getResumoGeral:  '📊 Resumo Geral',
  getClientes:     '👥 Clientes',
  getTarefas:      '✅ Tarefas',
  getFinanceiro:   '💰 Financeiro',
  getCampanhas:    '📣 Campanhas',
  getIntegracoes:  '🔌 Integrações',
}

export function AlphaToolBadge({ toolName }: AlphaToolBadgeProps) {
  const label = TOOL_LABELS[toolName] ?? toolName
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]">
      {label}
    </span>
  )
}
