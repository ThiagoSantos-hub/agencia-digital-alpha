import { createServerClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET — lista os clientes com Meta Ads conectado, pra um workflow (n8n) decidir
// quais chamadas de POST fazer em seguida. Protegida por CRON_SECRET, igual ao POST.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data, error } = await supabase
    .from('clients')
    .select('id, meta_ad_account_id, company_id')
    .not('meta_ad_account_id', 'is', null)
    .neq('status', 'inativo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    clients: (data ?? []).map(c => ({ clientId: c.id, adAccountId: c.meta_ad_account_id, companyId: c.company_id })),
  })
}

// Chamada tanto pelo navegador (sessão de admin, sync manual de um cliente) quanto
// pelo n8n via Schedule Trigger (sem sessão) — mesmo padrão de app/api/integrations/meta/refresh.
export async function POST(req: Request) {
  try {
    const { clientId, adAccountId, companyId: bodyCompanyId } = await req.json()

    if (!clientId || !adAccountId) {
      return NextResponse.json({ error: 'clientId e adAccountId são obrigatórios' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCronCall = !!cronSecret && authHeader === `Bearer ${cronSecret}`

    let supabase
    let companyId: string | null

    if (isCronCall) {
      // Chamada automatizada (n8n) — sem sessão de navegador, precisa vir com o
      // company_id do cliente já resolvido (o workflow busca isso antes de chamar).
      if (!bodyCompanyId) {
        return NextResponse.json({ error: 'companyId é obrigatório em chamadas automatizadas' }, { status: 400 })
      }
      supabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      companyId = bodyCompanyId
    } else {
      // Chamada manual do navegador — exige sessão, resolve a empresa por ela (nunca
      // confia em companyId vindo do body de um usuário comum).
      supabase = createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (!profile) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
      companyId = profile.company_id
    }

    // 1. Buscar token do Meta Ads da MESMA empresa do cliente que está sincronizando
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('company_id', companyId)
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Meta Ads não conectado ou token não encontrado' }, { status: 400 })
    }

    // 2. Garantir prefixo act_ no adAccountId
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`

    // 3. Chamar API do Meta para buscar campanhas reais
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,status,start_time,stop_time,daily_budget,lifetime_budget&access_token=${integration.access_token}`,
      { signal: controller.signal }
    )

    clearTimeout(timeoutId)
    const metaData = await metaRes.json()

    if (metaData.error) {
      console.error('Erro na API do Meta:', metaData.error)
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    const campaigns = metaData.data || []

    const statusMap: Record<string, string> = {
      'ACTIVE':      'ativa',
      'PAUSED':      'pausada',
      'ARCHIVED':    'finalizada',
      'IN_PROCESS':  'rascunho',
      'WITH_ERRORS': 'rascunho',
    }

    // 4. Sincronizar com o banco local
    // onConflict: 'meta_campaign_id' agora funciona pois a migration 008 criou a constraint UNIQUE
    for (const camp of campaigns) {
      const budget = camp.daily_budget
        ? parseFloat(camp.daily_budget) / 100
        : camp.lifetime_budget
          ? parseFloat(camp.lifetime_budget) / 100
          : null

      const { error: upsertError } = await supabase.from('campaigns').upsert({
        client_id:          clientId,
        company_id:         companyId,
        meta_campaign_id:   camp.id,
        name:               camp.name,
        status:             statusMap[camp.status] || 'rascunho',
        channel:            'meta_ads',
        budget:             budget,
        start_date:         camp.start_time ? camp.start_time.split('T')[0] : null,
        end_date:           camp.stop_time  ? camp.stop_time.split('T')[0]  : null,
      }, { onConflict: 'meta_campaign_id' })

      if (upsertError) console.error('Erro ao salvar campanha:', upsertError)
    }

    return NextResponse.json({ success: true, count: campaigns.length })
  } catch (error: any) {
    console.error('Erro no sync do Meta Ads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
