import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getReadClientFor } from '@/lib/superAdminDataClient'

export const dynamic = 'force-dynamic'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

const DAYS_BACK: Record<Granularity, number> = {
  daily: 30,
  weekly: 90,
  monthly: 365,
  yearly: 365 * 3,
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(`${dateStr}T00:00:00`)
  if (granularity === 'daily') return dateStr
  if (granularity === 'weekly') {
    const monday = new Date(d)
    const diaSemana = (d.getDay() + 6) % 7 // segunda = 0
    monday.setDate(d.getDate() - diaSemana)
    return monday.toISOString().slice(0, 10)
  }
  if (granularity === 'monthly') return `${dateStr.slice(0, 7)}-01`
  return `${dateStr.slice(0, 4)}-01-01`
}

// RLS de client_metrics_daily (client_metrics_daily_select_company) já
// restringe a leitura à empresa de quem está logado, não precisa checar
// company_id manualmente aqui, uma consulta pra outra empresa só volta vazia.
// Exceção: superadmin não tem empresa própria, então usa service-role pra
// conseguir acompanhar cliente de qualquer agência (getReadClientFor).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const dataClient = await getReadClientFor(supabase, user.id)

  const granularity = (request.nextUrl.searchParams.get('granularity') ?? 'daily') as Granularity
  if (!DAYS_BACK[granularity]) {
    return NextResponse.json({ error: 'granularity inválida' }, { status: 400 })
  }

  const desde = new Date()
  desde.setDate(desde.getDate() - DAYS_BACK[granularity])

  const { data: rows, error } = await dataClient
    .from('client_metrics_daily')
    .select('metric_date, source, impressions, reach, clicks, spend, leads, purchases, followers_count, profile_views')
    .eq('client_id', params.id)
    .gte('metric_date', desde.toISOString().slice(0, 10))
    .order('metric_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const metaBuckets = new Map<string, { impressions: number; reach: number; clicks: number; spend: number; leads: number; purchases: number }>()
  const igBuckets = new Map<string, { followers_count: number | null; profile_views: number }>()

  for (const row of rows ?? []) {
    const key = bucketKey(row.metric_date, granularity)
    if (row.source === 'meta_ads') {
      const b = metaBuckets.get(key) ?? { impressions: 0, reach: 0, clicks: 0, spend: 0, leads: 0, purchases: 0 }
      b.impressions += row.impressions ?? 0
      b.reach += row.reach ?? 0
      b.clicks += row.clicks ?? 0
      b.spend += Number(row.spend ?? 0)
      b.leads += row.leads ?? 0
      b.purchases += row.purchases ?? 0
      metaBuckets.set(key, b)
    } else if (row.source === 'instagram') {
      const b = igBuckets.get(key) ?? { followers_count: null, profile_views: 0 }
      // seguidores: mantém o último valor conhecido do período (é um total, não soma)
      if (row.followers_count != null) b.followers_count = row.followers_count
      b.profile_views += row.profile_views ?? 0
      igBuckets.set(key, b)
    }
  }

  const metaAds = Array.from(metaBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  const instagram = Array.from(igBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({ granularity, metaAds, instagram })
}
