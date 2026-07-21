import { NextRequest, NextResponse } from 'next/server'

// Escopo específico de cada serviço — cada um pede só o que precisa
const SCOPES: Record<string, string> = {
  google_ads: 'https://www.googleapis.com/auth/adwords',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  google_drive: 'https://www.googleapis.com/auth/drive.readonly',
  google_calendar: 'https://www.googleapis.com/auth/calendar.readonly',
}

// Gmail e Google Agenda podem ser conectados de duas formas: como integração
// da empresa (Integrações, um token só pra empresa toda) ou como conexão
// pessoal (Agenda, um token por usuário). O parâmetro `personal=1` distingue
// os dois — o callback usa isso pra saber em qual tabela salvar o token.
const PERSONAL_TYPES = ['gmail', 'google_calendar']

// Na Agenda pessoal, além de ler, o usuário cria reunião (precisa escrever no
// Google Agenda) e manda e-mail (precisa de gmail.send) — escopo maior só
// nesse fluxo, o da empresa continua só leitura.
const PERSONAL_SCOPES: Record<string, string> = {
  gmail: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
  google_calendar: 'https://www.googleapis.com/auth/calendar',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const personal = searchParams.get('personal') === '1'

  if (!type || !SCOPES[type]) {
    return NextResponse.redirect(new URL('/integracoes?error=google_invalid_type', request.url))
  }
  if (personal && !PERSONAL_TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/agenda?error=google_invalid_type', request.url))
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    personal ? PERSONAL_SCOPES[type] : SCOPES[type],
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
  authUrl.searchParams.set('state', personal ? `personal:${type}` : type)

  return NextResponse.redirect(authUrl.toString())
}
