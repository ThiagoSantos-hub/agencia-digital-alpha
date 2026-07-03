import { NextRequest, NextResponse } from 'next/server'

// Escopo específico de cada serviço — cada um pede só o que precisa
const SCOPES: Record<string, string> = {
  google_ads: 'https://www.googleapis.com/auth/adwords',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  google_drive: 'https://www.googleapis.com/auth/drive.readonly',
  google_calendar: 'https://www.googleapis.com/auth/calendar.readonly',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type || !SCOPES[type]) {
    return NextResponse.redirect(new URL('/integracoes?error=google_invalid_type', request.url))
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    SCOPES[type],
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  // consent -> garante refresh_token sempre | select_account -> força a tela de escolha de conta
  authUrl.searchParams.set('prompt', 'consent select_account')
  // state carrega qual serviço está sendo conectado, pro callback saber onde salvar
  authUrl.searchParams.set('state', type)

  return NextResponse.redirect(authUrl.toString())
}
