import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_SLOTS = ['meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4']

/**
 * POST /api/integrations/meta/refresh
 *
 * Renova tokens Meta de longa duração que estão próximos de expirar.
 * Projetado para ser chamado por n8n / cron de forma segura.
 *
 * Segurança:
 * - Exige header Authorization: Bearer <CRON_SECRET>
 * - Usa SUPABASE_SERVICE_ROLE_KEY (nunca expõe tokens para o cliente)
 *
 * Body opcional:
 * { "slot": "meta_ads" }  → renova só um slot
 * {} ou sem body         → renova todos os slots conectados que precisam
 */
export async function POST(request: NextRequest) {
  try {
    // ── Autenticação interna ──────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[meta/refresh] CRON_SECRET não configurado')
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const metaAppId = process.env.META_APP_ID
    const metaAppSecret = process.env.META_APP_SECRET

    if (!metaAppId || !metaAppSecret) {
      console.error('[meta/refresh] META_APP_ID ou META_APP_SECRET ausentes')
      return NextResponse.json({ error: 'Configuração Meta ausente' }, { status: 500 })
    }

    // ── Cliente com service role (bypass RLS) ─────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Quais slots renovar ───────────────────────────────────────────────
    let body: { slot?: string } = {}
    try {
      body = await request.json()
    } catch {
      // body vazio é válido
    }

    const slotsToCheck = body.slot && VALID_SLOTS.includes(body.slot)
      ? [body.slot]
      : VALID_SLOTS

    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, type, access_token, token_expiry, status')
      .in('type', slotsToCheck)
      .eq('status', 'connected')
      .not('access_token', 'is', null)

    if (fetchError) {
      console.error('[meta/refresh] Erro ao buscar integrações:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma integração Meta conectada para renovar',
        results: [],
      })
    }

    const now = Date.now()
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000
    const results: Array<{
      slot: string
      status: 'refreshed' | 'skipped' | 'error'
      reason?: string
      new_expiry?: string
    }> = []

    for (const integration of integrations) {
      const slot = integration.type
      const currentToken = integration.access_token as string
      const expiry = integration.token_expiry
        ? new Date(integration.token_expiry).getTime()
        : 0

      // Só renova se estiver a 15 dias ou menos de expirar (ou já expirou)
      const needsRefresh = !expiry || expiry - now <= FIFTEEN_DAYS_MS

      if (!needsRefresh) {
        results.push({
          slot,
          status: 'skipped',
          reason: `Token ainda válido até ${integration.token_expiry}`,
        })
        continue
      }

      try {
        // Troca por novo token de longa duração
        const exchangeUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
        exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token')
        exchangeUrl.searchParams.set('client_id', metaAppId)
        exchangeUrl.searchParams.set('client_secret', metaAppSecret)
        exchangeUrl.searchParams.set('fb_exchange_token', currentToken)

        const exchangeRes = await fetch(exchangeUrl.toString())
        const exchangeData = await exchangeRes.json()

        if (!exchangeRes.ok || exchangeData.error || !exchangeData.access_token) {
          const errorMsg = exchangeData.error?.message || 'Falha na troca do token'
          console.error(`[meta/refresh] Erro no slot ${slot}:`, errorMsg)

          // Se o token antigo já estiver inválido, marca como erro
          await supabase
            .from('integrations')
            .update({
              status: 'error',
              updated_at: new Date().toISOString(),
            })
            .eq('type', slot)

          results.push({
            slot,
            status: 'error',
            reason: errorMsg,
          })
          continue
        }

        const newToken = exchangeData.access_token as string
        const expiresIn = (exchangeData.expires_in as number) ?? 5184000 // ~60 dias
        const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString()

        const { error: updateError } = await supabase
          .from('integrations')
          .update({
            access_token: newToken,
            token_expiry: newExpiry,
            status: 'connected',
            updated_at: new Date().toISOString(),
          })
          .eq('type', slot)

        if (updateError) {
          console.error(`[meta/refresh] Erro ao atualizar slot ${slot}:`, updateError)
          results.push({
            slot,
            status: 'error',
            reason: updateError.message,
          })
          continue
        }

        results.push({
          slot,
          status: 'refreshed',
          new_expiry: newExpiry,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro inesperado'
        console.error(`[meta/refresh] Exception no slot ${slot}:`, message)
        results.push({
          slot,
          status: 'error',
          reason: message,
        })
      }
    }

    const refreshed = results.filter((r) => r.status === 'refreshed').length
    const errors = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      success: errors === 0,
      message: `Renovados: ${refreshed} | Erros: ${errors} | Ignorados: ${results.length - refreshed - errors}`,
      results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[meta/refresh] Erro geral:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
