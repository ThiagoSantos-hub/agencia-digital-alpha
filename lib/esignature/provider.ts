import * as autentique from './autentique'
import * as assinafy from './assinafy'

export type EsignatureProvider = 'autentique' | 'assinafy'

const CLIENTS = { autentique, assinafy }

// Cada empresa escolhe (companies.esignature_provider) qual dos dois provedores usa.
// Os dois módulos exportam a mesma assinatura de funções, então o dispatch é só
// escolher o módulo certo pelo nome do provedor.
export function getEsignatureClient(provider: string | null | undefined) {
  return CLIENTS[(provider as EsignatureProvider) ?? 'autentique'] ?? autentique
}
