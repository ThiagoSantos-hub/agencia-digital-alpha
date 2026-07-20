import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Rota temporária de diagnóstico — usa o token já salvo no sistema pra checar
// permissões reais e a resposta bruta de instagram_accounts, sem precisar
// configurar nada no Graph API Explorer. Remover depois de resolver o caso
// do Instagram não vinculando (act_1319748550155601 / Myrla T-Shirt).
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const adAccountId = searchParams.get('ad_account_id') ?? 'act_1319748550155601'

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('company_id', profile?.company_id)
    .eq('type', 'meta_ads')
    .eq('status', 'connected')
    .maybeSingle()

  if (!integration?.access_token) {
    return NextResponse.json({ error: 'sem_integracao_meta_ads_conectada' }, { status: 400 })
  }

  const token = integration.access_token

  const [permissionsRes, igAccountsRes, adAccountRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/${adAccountId}/instagram_accounts?access_token=${token}`),
    fetch(`https://graph.facebook.com/v19.0/${adAccountId}?fields=name,business&access_token=${token}`),
  ])

  const [permissions, igAccounts, adAccount] = await Promise.all([
    permissionsRes.json(),
    igAccountsRes.json(),
    adAccountRes.json(),
  ])

  return NextResponse.json({ adAccountId, permissions, igAccounts, adAccount })
}
