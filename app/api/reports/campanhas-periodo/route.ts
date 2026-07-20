import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { calcularPeriodo } from '@/lib/reportSchedule';

export const dynamic = 'force-dynamic';

// Client de serviço: mesma justificativa da rota de envio — precisa ler o
// token da integração Meta Ads, que a sessão do colaborador não enxerga via RLS.
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Retorna, na mesma ordem/regra usada no envio real (reports/send/route.ts),
// só as campanhas do cliente que efetivamente tiveram dado da Meta no período
// selecionado — pra tela de criação mostrar exatamente a quais campanhas
// cada <CAMP_N> vai corresponder na hora do envio.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ campanhas: [] });
  }

  const supabaseSession = createServerClient();
  const { data: { user } } = await supabaseSession.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabaseSession
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  const { data: integration } = await supabaseService
    .from('integrations')
    .select('access_token')
    .eq('company_id', profile?.company_id ?? '')
    .eq('type', 'meta_ads')
    .eq('status', 'connected')
    .maybeSingle();

  const { data: campaigns } = await supabaseService
    .from('campaigns')
    .select('name, meta_campaign_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!integration?.access_token || !campaigns || campaigns.length === 0) {
    return NextResponse.json({ campanhas: [] });
  }

  const periodo = searchParams.get('periodo') ?? 'ontem';
  const dataInicio = searchParams.get('data_inicio') ?? undefined;
  const dataFim = searchParams.get('data_fim') ?? undefined;
  const { dateStart, dateEnd } = calcularPeriodo(periodo, dataInicio, dataFim);

  const resultados = await Promise.all(
    campaigns.map(async (c) => {
      if (!c.meta_campaign_id) return null;
      const metaUrl = new URL(`https://graph.facebook.com/v19.0/${c.meta_campaign_id}/insights`);
      metaUrl.searchParams.set('fields', 'spend');
      metaUrl.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }));
      metaUrl.searchParams.set('access_token', integration.access_token);
      try {
        const res = await fetch(metaUrl.toString());
        const data = await res.json();
        if (data.error || !data.data?.[0]) return null;
        return c.name as string;
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({ campanhas: resultados.filter((n): n is string => n !== null) });
}
