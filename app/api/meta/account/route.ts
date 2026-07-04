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

    const fields = 'balance,currency,funding_source_details,amount_spent,spend_cap'
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
    const funding = metaData.funding_source_details

    const fmtBRL = (centavos: number | string | null | undefined) => {
      if (centavos === null || centavos === undefined) return null
      const valor = typeof centavos === 'string' ? parseFloat(centavos) : centavos
      return (valor / 100).toLocaleString('pt-BR', { style: 'currency', currency })
    }

    // type 1 = cartão de crédito, type 20 = créditos/cupons
    const temCartao = funding?.type === 1

    // Fundos = soma dos cupons ativos
    let fundos: string | null = null
    if (funding?.coupons && Array.isArray(funding.coupons)) {
      const totalFundos = funding.coupons.reduce((acc: number, c: any) => {
        return acc + (parseInt(c.amount ?? '0'))
      }, 0)
      fundos = fmtBRL(totalFundos)
    }

    // Saldo:
    // - tem cartão → balance é o saldo disponível no cartão
    // - não tem cartão (créditos) → display_string traz o saldo formatado
    let saldo: string | null = null
    if (temCartao) {
      saldo = fmtBRL(metaData.balance)
    } else if (funding?.display_string) {
      saldo = funding.display_string
    } else if (metaData.balance) {
      saldo = fmtBRL(metaData.balance)
    }

    return NextResponse.json({
      saldo,
      fundos,
      temCartao,
      currency,
    })
  } catch (error: any) {
    console.error('Erro ao buscar conta Meta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
