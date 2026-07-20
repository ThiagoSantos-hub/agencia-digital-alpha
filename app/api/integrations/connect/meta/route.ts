import { NextRequest, NextResponse } from 'next/server'

const VALID_SLOTS = ['meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slot = searchParams.get('slot') ?? 'meta_ads'

  if (!VALID_SLOTS.includes(slot)) {
    return NextResponse.redirect(new URL('/integracoes?error=meta_invalid_slot', request.url))
  }

  // instagram_basic + instagram_manage_insights: sem isso os relatórios não
  // conseguem ler seguidores/visitas ao perfil do Instagram vinculado à conta
  // de anúncios (a chamada à Graph API falha silenciosamente e cai pro "—").
  const scopes = ['ads_read', 'ads_management', 'business_management', 'instagram_basic', 'instagram_manage_insights'].join(',')
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', slot) // carrega qual slot está conectando
  authUrl.searchParams.set('auth_type', 'rerequest') // força a tela de escolha de conta

  return NextResponse.redirect(authUrl.toString())
}
