import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { clientId, adAccountId } = await req.json()
    const supabase = createClient()

    // 1. Buscar token do Meta Ads
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Meta Ads não conectado' }, { status: 400 })
    }

    // 2. Chamar API do Meta para buscar campanhas reais
    // Documentação: https://developers.facebook.com/docs/marketing-api/reference/ad-account/campaigns/
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=id,name,status,start_time,stop_time,daily_budget,lifetime_budget&access_token=${integration.access_token}`
    )
    
    const metaData = await metaRes.json()
    if (metaData.error) throw new Error(metaData.error.message)

    const campaigns = metaData.data || []

    // 3. Sincronizar com o banco local
    for (const camp of campaigns) {
      const budget = camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : 
                     camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null
      
      const statusMap: Record<string, string> = {
        'ACTIVE': 'ativa',
        'PAUSED': 'pausada',
        'ARCHIVED': 'finalizada',
        'IN_PROCESS': 'rascunho',
        'WITH_ERRORS': 'rascunho'
      }

      await supabase.from('campaigns').upsert({
        client_id: clientId,
        meta_campaign_id: camp.id,
        name: camp.name,
        status: statusMap[camp.status] || 'rascunho',
        channel: 'meta_ads',
        budget: budget,
        start_date: camp.start_time ? camp.start_time.split('T')[0] : null,
        end_date: camp.stop_time ? camp.stop_time.split('T')[0] : null
      }, { onConflict: 'meta_campaign_id' })
    }

    return NextResponse.json({ success: true, count: campaigns.length })
  } catch (error: any) {
    console.error('Erro no sync do Meta Ads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
