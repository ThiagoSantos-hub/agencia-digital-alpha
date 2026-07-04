import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const adAccountId = searchParams.get('adAccountId')

    if (!adAccountId) {
      return NextResponse.json({ error: 'adAccountId é obrigatório' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Token Meta Ads não encontrado' }, { status: 400 })
    }

    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    // Buscar campos + endpoint de ads_payment_cycles para fundos reais
    const fields = 'balance,currency,funding_source_details,amount_spent,spend_cap,ads_payment_cycle'
    const metaUrl = new URL(`https://graph.facebook.com/v19.0/${accountId}`)
    metaUrl.searchParams.set('fields', fields)
    metaUrl.searchParams.set('access_token', integration.access_token)

    const metaRes = await fetch(metaUrl.toString())
    const metaData = await metaRes.json()

    if (metaData.error) {
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    return NextResponse.json({ raw: metaData })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
