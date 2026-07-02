import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/integracoes?error=google_auth_failed', request.url)
    )
  }

  try {
    // Trocar o code pelos tokens
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
      console.error('Erro ao trocar token Google:', tokens)
      return NextResponse.redirect(
        new URL('/integracoes?error=google_token_failed', request.url)
      )
    }

    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000)

    // Salvar tokens na tabela integrations para todas as integrações Google
    const supabase = createClient()

    const googleIntegrations = ['google_ads', 'gmail', 'google_drive', 'google_calendar']

    const { error: dbError } = await supabase
      .from('integrations')
      .update({
        status: 'connected',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiryDate.toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('type', googleIntegrations)

    if (dbError) {
      console.error('Erro ao salvar token no Supabase:', dbError)
      return NextResponse.redirect(
        new URL('/integracoes?error=google_db_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/integracoes?success=google_connected', request.url)
    )
  } catch (err) {
    console.error('Erro inesperado no callback Google:', err)
    return NextResponse.redirect(
      new URL('/integracoes?error=google_unexpected', request.url)
    )
  }
}
