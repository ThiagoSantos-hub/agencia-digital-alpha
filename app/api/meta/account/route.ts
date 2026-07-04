import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/meta/account?adAccountId=act_XXXXX
// Retorna saldo, fundos e status do cartão da conta de anúncios do Meta
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
      .eq('status', 'connected')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Meta Ads não conectado' }, { status: 400 })
    }

    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    // Buscar dados financeiros da conta: saldo, fundos e método de pagamento
    const fields = 'balance,spend_cap,amount_spent,funding_source_details,is_prepay_account,currency'
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
    const divisor = currency === 'BRL' ? 100 : 100

    const fmtBRL = (centavos: number | null) => {
      if (centavos === null || centavos === undefined) return null
      return (centavos / divisor).toLocaleString('pt-BR', { style: 'currency', currency })
    }

    // Detectar se tem cartão de crédito como método de pagamento
    const funding = metaData.funding_source_details
    const temCartao = funding?.type === 1 // type 1 = cartão de crédito no Meta

    return NextResponse.json({
      saldo:       fmtBRL(metaData.balance),
      fundos:      fmtBRL(metaData.spend_cap ? metaData.spend_cap - metaData.amount_spent : null),
      temCartao:   temCartao ?? false,
      isPrepay:    metaData.is_prepay_account ?? false,
      currency,
    })
  } catch (error: any) {
    console.error('Erro ao buscar conta Meta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
