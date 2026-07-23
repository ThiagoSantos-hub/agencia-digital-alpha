import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkAndStoreMetaAdsIdentity } from '@/lib/metaAdsIdentity'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/colaborador/integracoes?error=meta_auth_failed', request.url))
  }

  try {
    // Trocar code por access_token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_APP_URL + '/api/auth/callback/meta-collaborator')
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokens = await tokenRes.json()

    if (!tokenRes.ok || tokens.error) {
      return NextResponse.redirect(new URL('/colaborador/integracoes?error=meta_token_failed', request.url))
    }

    // Token de longa duração
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', tokens.access_token)

    const longLivedRes = await fetch(longLivedUrl.toString())
    const longLivedTokens = await longLivedRes.json()
    const finalToken = longLivedTokens.access_token ?? tokens.access_token

    // Buscar o colaborador logado
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!collaborator) {
      return NextResponse.redirect(new URL('/colaborador/integracoes?error=collaborator_not_found', request.url))
    }

    // Mesma trava do plano Gratuito do callback principal (app/api/auth/callback/meta) —
    // um colaborador conectando não pode contornar o limite.
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    if (profile?.company_id) {
      const { blocked } = await checkAndStoreMetaAdsIdentity(profile.company_id, finalToken)
      if (blocked) {
        return NextResponse.redirect(new URL('/colaborador/integracoes?error=meta_free_plan_duplicate', request.url))
      }
    }

    // Salvar token na tabela collaborator_integrations
    const { error: dbError } = await supabase
      .from('collaborator_integrations')
      .upsert({
        collaborator_id: collaborator.id,
        type: 'meta_ads',
        api_key: finalToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'collaborator_id,type' })

    if (dbError) {
      return NextResponse.redirect(new URL('/colaborador/integracoes?error=meta_db_failed', request.url))
    }

    return NextResponse.redirect(new URL('/colaborador/integracoes?success=meta_connected', request.url))
  } catch {
    return NextResponse.redirect(new URL('/colaborador/integracoes?error=meta_unexpected', request.url))
  }
}
