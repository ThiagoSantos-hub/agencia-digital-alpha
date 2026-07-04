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

    // Campos reais e válidos da API do Meta Ads
    const fields = 'balance,currency,funding_source_details,adspaymentcycle'
    const metaUrl = new URL(`https://graph.facebook.com/v19.0/${accountId}`)
    metaUrl.searchParams.set('fields', fields)
    metaUrl.searchParams.set('access_token', integration.access_token)

    const metaRes = await fetch(metaUrl.toString())
    const metaData = await metaRes.json()

    if (metaData.error) {
      console.error('Erro Meta account:', metaData.error)
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    const currency = metaData.currency ?? 'BRL'

    const fmtBRL = (centavos: number | string | null | undefined) => {
      if (centavos === null || centavos === undefined) return null
      const valor = typeof centavos === 'string' ? parseFloat(centavos) : centavos
      return (valor / 100).toLocaleString('pt-BR', { style: 'currency', currency })
    }

    // Buscar fundos separadamente via endpoint de financiamento
    const fundosUrl = new URL(`https://graph.facebook.com/v19.0/${accountId}/funding_source_details`)
    fundosUrl.searchParams.set('access_token', integration.access_token)

    // Detectar cartão: type 1 = cartão de crédito no Meta
    const funding = metaData.funding_source_details
    const temCartao = funding?.type === 1

    const saldo = fmtBRL(metaData.balance)
    const fundosRaw = metaData.adspaymentcycle?.amount ?? null
    const fundos = fundosRaw !== null ? fmtBRL(fundosRaw) : null

    return NextResponse.json({
      saldo,
      fundos,
      temCartao: temCartao ?? false,
      currency,
    })
  } catch (error: any) {
    console.error('Erro ao buscar conta Meta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
