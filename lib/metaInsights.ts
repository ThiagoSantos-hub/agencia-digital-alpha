// Funções de leitura da Graph API da Meta reaproveitadas entre o envio de
// relatórios (app/api/reports/send/route.ts) e o snapshot diário de
// crescimento (app/api/clients/metrics-snapshot/route.ts). Extraído de
// dentro de reports/send pra não duplicar as descobertas já feitas ali
// (metric_type incompatível quando follower_count e profile_views são
// pedidos juntos, janela since/until meio-aberta do endpoint de insights).

export function normalizeAdAccountId(adAccountId: string): string {
  return adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
}

export interface InstagramRawMetrics {
  igAccountId: string | null
  newFollowers: number | null
  profileViews: number | null
  followersCount: number | null
}

/** Descobre a conta do Instagram vinculada à conta de anúncios (sem conexão separada) */
async function findInstagramAccountId(adAccountId: string, accessToken: string): Promise<string | null> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${normalizeAdAccountId(adAccountId)}/instagram_accounts?access_token=${accessToken}`
  )
  const data = await res.json()
  if (data?.error) {
    console.error(`[metaInsights] erro ao buscar instagram_accounts de ${adAccountId}:`, data.error.message ?? data.error)
    return null
  }
  return data?.data?.[0]?.id ?? null
}

/**
 * Métricas brutas do Instagram vinculado à conta de anúncios, para o período
 * dado. follower_count e profile_views exigem metric_type diferentes,
 * combinar os dois numa única chamada faz o Instagram recusar a requisição
 * inteira com erro #100. O endpoint de insights trata since/until como uma
 * janela meio-aberta [since, until); quando o período é um único dia
 * (since === until) a janela fica com largura zero, por isso o until usado
 * aqui é sempre dateEnd + 1 dia.
 */
export async function getInstagramRawMetrics(
  adAccountId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<InstagramRawMetrics> {
  const fallback: InstagramRawMetrics = { igAccountId: null, newFollowers: null, profileViews: null, followersCount: null }
  try {
    const igAccountId = await findInstagramAccountId(adAccountId, accessToken)
    if (!igAccountId) return fallback

    const umDiaDepois = (dataStr: string) => {
      const d = new Date(`${dataStr}T00:00:00`)
      d.setDate(d.getDate() + 1)
      return d.toISOString().slice(0, 10)
    }
    const untilInsights = umDiaDepois(dateEnd)

    const [followerRes, viewsRes, profileRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=follower_count&period=day&metric_type=time_series&since=${dateStart}&until=${untilInsights}&access_token=${accessToken}`),
      fetch(`https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=profile_views&period=day&metric_type=total_value&since=${dateStart}&until=${untilInsights}&access_token=${accessToken}`),
      fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count&access_token=${accessToken}`),
    ])
    const followerData = await followerRes.json()
    const viewsData = await viewsRes.json()
    const profileData = await profileRes.json()

    if (followerData?.error) console.error(`[metaInsights] erro follower_count de ${igAccountId}:`, followerData.error.message ?? followerData.error)
    if (viewsData?.error) console.error(`[metaInsights] erro profile_views de ${igAccountId}:`, viewsData.error.message ?? viewsData.error)
    if (profileData?.error) console.error(`[metaInsights] erro followers_count de ${igAccountId}:`, profileData.error.message ?? profileData.error)

    const valoresFollower: Array<{ value?: number }> = followerData?.data?.[0]?.values ?? []
    const newFollowers = followerData?.data ? valoresFollower.reduce((soma, v) => soma + (v.value ?? 0), 0) : null

    const profileViews = typeof viewsData?.data?.[0]?.total_value?.value === 'number'
      ? viewsData.data[0].total_value.value
      : null

    const followersCount = typeof profileData?.followers_count === 'number' ? profileData.followers_count : null

    return { igAccountId, newFollowers, profileViews, followersCount }
  } catch (err) {
    console.error('[metaInsights] falha ao buscar métricas do Instagram:', err)
    return fallback
  }
}

/** Versão formatada (pt-BR, com fallback '—') usada nos templates de relatório */
export async function getInstagramMetrics(
  adAccountId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<{ seguidores: string; visitas: string }> {
  const raw = await getInstagramRawMetrics(adAccountId, accessToken, dateStart, dateEnd)
  return {
    seguidores: raw.newFollowers !== null ? raw.newFollowers.toLocaleString('pt-BR') : '—',
    visitas: raw.profileViews !== null ? raw.profileViews.toLocaleString('pt-BR') : '—',
  }
}

export interface DailyAdAccountMetrics {
  date: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  leads: number
  purchases: number
}

/**
 * Insights diários (time_increment=1) no nível da conta de anúncios inteira,
 * soma automaticamente todas as campanhas do cliente num único request, ao
 * contrário do fluxo de relatório (que soma campanha por campanha).
 */
export async function getDailyAdAccountInsights(
  adAccountId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<DailyAdAccountMetrics[]> {
  const url = new URL(`https://graph.facebook.com/v19.0/${normalizeAdAccountId(adAccountId)}/insights`)
  url.searchParams.set('fields', 'impressions,reach,clicks,spend,actions,date_start')
  url.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }))
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString())
  const data = await res.json()

  if (data?.error) {
    console.error(`[metaInsights] erro ao buscar insights diários de ${adAccountId}:`, data.error.message ?? data.error)
    return []
  }

  const getAction = (actions: any[] | undefined, key: string) =>
    Number(actions?.find((a) => a.action_type === key)?.value ?? 0)

  return (data?.data ?? []).map((d: any) => ({
    date: d.date_start,
    impressions: Number(d.impressions ?? 0),
    reach: Number(d.reach ?? 0),
    clicks: Number(d.clicks ?? 0),
    spend: Number(d.spend ?? 0),
    leads: getAction(d.actions, 'lead'),
    purchases: getAction(d.actions, 'purchase'),
  }))
}
