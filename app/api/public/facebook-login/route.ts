import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Login com Facebook pra identidade (não é conectar Meta Ads pra anúncios).
// Só pede public_profile, permissão liberada por padrão pelo Facebook, sem
// precisar de App Review novo — reaproveita o mesmo App (META_APP_ID) já
// usado pra Meta Ads, só com um redirect_uri dedicado.
export async function GET() {
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', process.env.META_PUBLIC_LOGIN_REDIRECT_URI!)
  authUrl.searchParams.set('scope', 'public_profile')
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
