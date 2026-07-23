// Mensagens específicas pros códigos de erro que os callbacks OAuth
// (app/api/auth/callback/meta, meta-collaborator, google) mandam via
// ?error=... — antes as telas de Integrações só mostravam um genérico "Erro
// ao conectar" pra qualquer código, sem dizer o que de fato aconteceu.
const MESSAGES: Record<string, string> = {
  meta_auth_failed: 'Não foi possível autorizar o acesso ao Facebook. Tente conectar de novo.',
  meta_invalid_slot: 'Esse slot de conexão do Meta Ads é inválido.',
  meta_token_failed: 'O Facebook não retornou um token de acesso válido. Tente conectar de novo.',
  meta_db_failed: 'Conectamos ao Facebook, mas não conseguimos salvar no sistema. Tente de novo ou fale com o suporte.',
  meta_unexpected: 'Erro inesperado ao conectar o Meta Ads. Tente novamente.',
  meta_free_plan_duplicate: 'Essa conta do Facebook já está conectada em outra empresa no plano Gratuito. Não é possível usar a mesma conta em mais de uma empresa Gratuita — faça upgrade de plano pra continuar.',
  collaborator_not_found: 'Não encontramos seu cadastro de colaborador. Fale com o admin da sua empresa.',
  google_auth_failed: 'Não foi possível autorizar o acesso à conta Google. Tente conectar de novo.',
  google_invalid_type: 'Tipo de conexão Google inválido.',
  google_token_failed: 'O Google não retornou um token de acesso válido. Tente conectar de novo.',
  google_db_failed: 'Conectamos à conta Google, mas não conseguimos salvar no sistema. Tente de novo ou fale com o suporte.',
  google_unexpected: 'Erro inesperado ao conectar a conta Google. Tente novamente.',
}

export function getIntegrationErrorMessage(code: string): string {
  return MESSAGES[code] ?? 'Erro ao conectar. Tente novamente.'
}
