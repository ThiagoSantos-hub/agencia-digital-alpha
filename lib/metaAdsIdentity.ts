import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Chamado nos callbacks OAuth do Meta Ads (app/api/auth/callback/meta e
// meta-collaborator) logo depois de obter um access_token válido. Diferente
// do meta_tester_profile (texto digitado, fácil de falsificar), aqui a
// identidade vem de um login real no Facebook — não dá pra fingir. Só
// aplica a trava pra empresas no plano Gratuito: conectar o Meta Ads é o
// momento em que a conta passa a "valer a pena" de verdade (gerencia
// clientes reais), então é o ponto certo pra impedir a mesma pessoa real
// usando várias contas Gratuitas em paralelo. Empresas pagas nunca são
// bloqueadas por isso.
export async function checkAndStoreMetaAdsIdentity(
  companyId: string,
  accessToken: string
): Promise<{ blocked: boolean }> {
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('plan, facebook_ads_id')
    .eq('id', companyId)
    .maybeSingle()

  if (!company?.plan) return { blocked: false }

  const { data: planRow } = await supabaseAdmin.from('plans').select('is_free').eq('id', company.plan).maybeSingle()
  if (!planRow?.is_free) return { blocked: false }

  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${accessToken}`)
  const me = await meRes.json()
  if (!meRes.ok || me.error || !me.id) return { blocked: false } // falha na Graph API não deve travar a conexão

  // Reconectando a mesma conta que essa empresa já usava — sem problema.
  if (company.facebook_ads_id === me.id) return { blocked: false }

  const { data: existing } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('facebook_ads_id', me.id)
    .neq('id', companyId)
    .maybeSingle()

  if (existing) return { blocked: true }

  await supabaseAdmin.from('companies').update({ facebook_ads_id: me.id }).eq('id', companyId)
  return { blocked: false }
}
