import { NextResponse } from 'next/server'

export async function GET() {
  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
