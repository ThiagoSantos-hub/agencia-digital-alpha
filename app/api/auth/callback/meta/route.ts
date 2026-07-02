import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/integracoes?error=meta_auth_failed', request.url)
    )
  }

  try {
    // Trocar o code pelos tokens
    const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokens = await tokenRes.json()

    if (!tokenRes.ok || tokens.error) {
      console.error('Erro ao trocar token Meta:', tokens)
      return NextResponse.redirect(
        new URL('/integracoes?error=meta_token_failed', request.url)
      )
    }

    // Token de longa duração (60 dias)
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', tokens.access_token)

    const longLivedRes = await fetch(longLivedUrl.toString())
    const longLivedTokens = await longLivedRes.json()

    const finalToken = longLivedTokens.access_token ?? tokens.access_token
    const expiresIn = longLivedTokens.expires_in ?? tokens.expires_in ?? 5184000 // 60 dias
    const expiryDate = new Date(Date.now() + expiresIn * 1000)

    // Salvar na tabela integrations
    const supabase = createClient()

    const { error: dbError } = await supabase
      .from('integrations')
      .update({
        status: 'connected',
        access_token: finalToken,
        refresh_token: null,
        token_expiry: expiryDate.toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('type', 'meta_ads')

    if (dbError) {
      console.error('Erro ao salvar token Meta no Supabase:', dbError)
      return NextResponse.redirect(
        new URL('/integracoes?error=meta_db_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/integracoes?success=meta_connected', request.url)
    )
  } catch (err) {
    console.error('Erro inesperado no callback Meta:', err)
    return NextResponse.redirect(
      new URL('/integracoes?error=meta_unexpected', request.url)
    )
  }
}
