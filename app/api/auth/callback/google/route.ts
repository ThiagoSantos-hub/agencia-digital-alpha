import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const VALID_TYPES = ['google_ads', 'gmail', 'google_drive', 'google_calendar']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const type = searchParams.get('state')

  if (error || !code) {
    return NextResponse.redirect(new URL('/integracoes?error=google_auth_failed', request.url))
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/integracoes?error=google_invalid_type', request.url))
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenResponse.json()
    if (!tokenResponse.ok || tokens.error) {
      return NextResponse.redirect(new URL('/integracoes?error=google_token_failed', request.url))
    }

    // Busca qual e-mail Google foi usado nessa conexão
    let connectedEmail: string | null = null
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json()
        connectedEmail = userInfo.email ?? null
      }
    } catch {
      // se falhar, segue sem e-mail — não bloqueia a conexão
    }

    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000)

    // Mesmo motivo do callback do Meta: precisa da sessão de quem clicou em
    // "Conectar", senão a RLS de integrations bloqueia o UPDATE em silêncio e a
    // rota redirecionava pra "sucesso" mesmo sem salvar nada.
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: updated, error: dbError } = await supabase
      .from('integrations')
      .update({
        status: 'connected',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiryDate.toISOString(),
        connected_at: new Date().toISOString(),
        config: connectedEmail ? { connected_email: connectedEmail } : {},
        updated_at: new Date().toISOString(),
      })
      .eq('type', type) // <- a RLS já restringe à própria empresa
      .select('id')

    if (dbError || !updated || updated.length === 0) {
      return NextResponse.redirect(new URL('/integracoes?error=google_db_failed', request.url))
    }

    return NextResponse.redirect(new URL(`/integracoes?success=google_connected&service=${type}`, request.url))
  } catch {
    return NextResponse.redirect(new URL('/integracoes?error=google_unexpected', request.url))
  }
}
