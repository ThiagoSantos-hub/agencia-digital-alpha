import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Superadmin não pertence a nenhuma empresa (company_id nulo no perfil), então
 * qualquer RLS restrita por get_current_company_id() nunca libera nada pra
 * ele. Pra permitir que o superadmin acompanhe o cliente de qualquer agência
 * (visão geral/suporte), troca pro client de service-role só pra LEITURA
 * quando for o caso. Usado pelas rotas do módulo Acompanhamento do Cliente
 * (growth, ai-analysis, squad).
 */
export async function getReadClientFor(session: SupabaseClient, userId: string): Promise<SupabaseClient> {
  const { data: profile } = await session.from('profiles').select('is_super_admin').eq('id', userId).single()
  return profile?.is_super_admin ? supabaseAdmin : session
}
