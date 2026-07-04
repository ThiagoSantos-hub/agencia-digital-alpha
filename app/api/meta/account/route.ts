import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const adAccountId = searchParams.get('adAccountId')

    if (!adAccountId) {
      return NextResponse.json({ error: 'adAccountId é obrigatório' }, { status: 400 })
    }

    // Buscar token diretamente sem RLS — integrations é lida por qualquer autenticado
    const supabase = createServerClient()
    // Fallback: buscar sem checar status para garantir que acha o token


    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token, status')
      .eq('type', 'meta_ads')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Token Meta Ads não encontrado' }, { status: 400 })
    }

    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    // Campos corretos da API do Meta:
    // balance        = saldo devedor atual (negativo = deve, positivo = crédito)
    // prepay_amount  = fundos pré-pagos disponíveis
    // funding_source_details = método de pagamento (cartão, etc)
    // currency       = moeda da conta
    const fields = 'balance,prepay_amount,funding_source_details,currency'
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

    // Meta retorna valores em centavos
    const fmtBRL = (centavos: number | string | null | undefined) => {
      if (centavos === null || centavos === undefined) return null
      const valor = typeof centavos === 'string' ? parseFloat(centavos) : centavos
      return (valor / 100).toLocaleString('pt-BR', { style: 'currency', currency })
    }

    // Detectar cartão: type 1 = cartão de crédito
    const funding = metaData.funding_source_details
    const temCartao = funding?.type === 1

    return NextResponse.json({
      saldo:     fmtBRL(metaData.balance),
      fundos:    fmtBRL(metaData.prepay_amount),
      temCartao: temCartao ?? false,
      currency,
    })
  } catch (error: any) {
    console.error('Erro ao buscar conta Meta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
