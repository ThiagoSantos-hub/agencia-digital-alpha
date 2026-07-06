import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const scopes = ['ads_read', 'ads_management', 'business_management'].join(',')
  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  authUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_APP_URL + '/api/auth/callback/meta-collaborator')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', 'collaborator')
  authUrl.searchParams.set('auth_type', 'rerequest')

  return NextResponse.redirect(authUrl.toString())
}
