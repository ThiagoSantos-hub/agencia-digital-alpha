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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
      {label}
    </span>
  )
}
