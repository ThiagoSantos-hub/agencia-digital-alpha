import { NextRequest, NextResponse } from 'next/server'
import { signFacebookToken } from '@/lib/facebookLoginToken'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'

// Callback do login público com Facebook — SEM sessão do Supabase (é usado
// antes da conta existir, no formulário de cadastro gratuito). Troca o code
// pelo access_token, confirma a identidade real via GET /me (não é texto
// digitado como meta_tester_profile), e devolve um token curto assinado pra
// /assinar continuar o cadastro.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/assinar?fb_error=1', request.url))
  }

  try {
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', process.env.META_PUBLIC_LOGIN_REDIRECT_URI!)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokens = await tokenRes.json()
    if (!tokenRes.ok || tokens.error || !tokens.access_token) {
      return NextResponse.redirect(new URL('/assinar?fb_error=1', request.url))
    }

    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${tokens.access_token}`)
    const me = await meRes.json()
    if (!meRes.ok || me.error || !me.id) {
      return NextResponse.redirect(new URL('/assinar?fb_error=1', request.url))
    }

    const fbToken = signFacebookToken(me.id)
    const redirectUrl = new URL(`${APP_URL}/assinar`)
    redirectUrl.searchParams.set('fb_token', fbToken)
    redirectUrl.searchParams.set('fb_name', me.name ?? '')
    return NextResponse.redirect(redirectUrl.toString())
  } catch {
    return NextResponse.redirect(new URL('/assinar?fb_error=1', request.url))
  }
}
