import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const VALID_SLOTS = ['meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const slot = searchParams.get('state') ?? 'meta_ads'

  if (error || !code) {
    return NextResponse.redirect(new URL('/integracoes?error=meta_auth_failed', request.url))
  }

  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.redirect(new URL('/integracoes?error=meta_invalid_slot', request.url))
  }

  try {
    // Troca code por access_token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokens = await tokenRes.json()

    if (!tokenRes.ok || tokens.error) {
      return NextResponse.redirect(new URL('/integracoes?error=meta_token_failed', request.url))
    }

    // Troca por token de longa duração (~60 dias)
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', tokens.access_token)

    const longLivedRes = await fetch(longLivedUrl.toString())
    const longLivedTokens = await longLivedRes.json()

    const finalToken = longLivedTokens.access_token ?? tokens.access_token
    const expiresIn = longLivedTokens.expires_in ?? tokens.expires_in ?? 5184000
    const expiryDate = new Date(Date.now() + expiresIn * 1000)

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
      .eq('type', slot) // salva no slot correto (meta_ads, meta_ads_2, etc.)

    if (dbError) {
      return NextResponse.redirect(new URL('/integracoes?error=meta_db_failed', request.url))
    }

    return NextResponse.redirect(new URL(`/integracoes?success=meta_connected&slot=${slot}`, request.url))
  } catch {
    return NextResponse.redirect(new URL('/integracoes?error=meta_unexpected', request.url))
  }
}
