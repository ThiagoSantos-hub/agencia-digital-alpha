// Registro central das funcionalidades gateáveis por plano. Cada chave aqui
// vira um checkbox em /superadmin/planos ("Liberado"/"Bloqueado"); o valor
// real de bloqueio fica em plans.features (JSONB), não aqui — isso é só o
// catálogo de "o que existe pra travar". Adicionar uma funcionalidade nova =
// acrescentar uma linha + envolver o botão/seção certa com <FeatureLock>, sem
// precisar de migration (o JSONB aceita qualquer chave nova).
export interface FeatureDef {
  key: string
  label: string
  group: string
}

export const FEATURES: FeatureDef[] = [
  { key: 'modulo.clientes', label: 'Módulo Clientes', group: 'Módulos' },
  { key: 'modulo.campanhas', label: 'Módulo Campanhas', group: 'Módulos' },
  { key: 'modulo.relatorios', label: 'Módulo Relatórios', group: 'Módulos' },
  { key: 'modulo.alertas', label: 'Módulo Alertas', group: 'Módulos' },
  { key: 'modulo.agenda', label: 'Módulo Agenda', group: 'Módulos' },
  { key: 'modulo.tarefas', label: 'Módulo Tarefas', group: 'Módulos' },
  { key: 'modulo.checklists', label: 'Módulo Checklists', group: 'Módulos' },
  { key: 'modulo.contratos', label: 'Módulo Contratos', group: 'Módulos' },
  { key: 'modulo.financeiro', label: 'Módulo Financeiro', group: 'Módulos' },
  { key: 'modulo.colaboradores', label: 'Módulo Colaboradores', group: 'Módulos' },
  { key: 'modulo.ai', label: 'Módulo Alpha AI', group: 'Módulos' },
  { key: 'modulo.integracoes', label: 'Módulo Integrações', group: 'Módulos' },
  { key: 'contratos.assinatura_eletronica', label: 'Assinatura Eletrônica (Autentique/Assinafy)', group: 'Contratos' },
  { key: 'ai.microfone_flutuante', label: 'Assistente por voz (microfone flutuante)', group: 'Alpha AI' },
]

export const FEATURE_GROUPS: string[] = Array.from(new Set(FEATURES.map((f) => f.group)))

// Ausente no JSONB = liberado (true). Só precisa listar o que está bloqueado.
export function isFeatureLocked(features: Record<string, boolean> | null | undefined, key: string): boolean {
  if (!features) return false
  return features[key] === false
}
