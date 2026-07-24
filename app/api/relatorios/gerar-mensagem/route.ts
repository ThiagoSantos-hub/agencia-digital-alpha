import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getInstagramMetrics } from '@/lib/metaInsights';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { report_id } = await request.json();

    if (!report_id) {
      return NextResponse.json({ error: 'report_id é obrigatório' }, { status: 400 });
    }

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
    }

    const { dateStart, dateEnd, diasAtivo } = calcularPeriodo(
      report.periodo,
      report.data_inicio,
      report.data_fim
    );

    // Mesma correção aplicada em app/api/reports/send: resolve a empresa dona
    // do relatório antes de buscar a integração, pra não pegar a de outra empresa.
    const { data: reportOwner } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', report.user_id)
      .single();
    const reportCompanyId = reportOwner?.company_id ?? null;

    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('company_id', reportCompanyId)
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle();

    let nomeConta = '—';
    let clientAdAccountId: string | null = null;

    if (report.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, meta_ad_account_id')
        .eq('id', report.client_id)
        .single();

      if (client) {
        nomeConta = client.name;
        clientAdAccountId = client.meta_ad_account_id;

        if (integration?.access_token && client.meta_ad_account_id) {
          try {
            const metaContaUrl = `https://graph.facebook.com/v19.0/${client.meta_ad_account_id}?fields=name&access_token=${integration.access_token}`;
            const metaContaRes = await fetch(metaContaUrl);
            const metaContaData = await metaContaRes.json();

            if (metaContaData?.name) nomeConta = metaContaData.name;
          } catch {
            // Mantém client.name como fallback.
          }
        }
      }
    }

    let metaValues: Record<string, string> = {};

    if (integration?.access_token && report.client_id) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, meta_campaign_id')
        .eq('client_id', report.client_id)
        .eq('status', 'ativa')
        .order('created_at', { ascending: true })
        .limit(10);

      if (campaigns && campaigns.length > 0) {
        const acc = {
          impressions: 0,
          reach: 0,
          clicks: 0,
          spend: 0,
          cpm_sum: 0,
          cpc_sum: 0,
          ctr_sum: 0,
          frequency_sum: 0,
          conv_values: 0,
          video3s: 0,
          actions: {} as Record<string, number>,
          costs: {} as Record<string, number>,
          roas: 0,
          outbound_ctr_sum: 0,
          outbound_cpc_sum: 0,
          count: 0,
        };
        const conversasPorCampanha: number[] = [];

        for (const campaign of campaigns) {
          if (!campaign.meta_campaign_id) {
            conversasPorCampanha.push(0);
            continue;
          }

          const fields =
            'impressions,reach,clicks,ctr,spend,cpm,cpc,frequency,actions,cost_per_action_type,purchase_roas,conversion_values,video_30_sec_watched_actions,outbound_clicks_ctr,cost_per_outbound_click';
          const metaUrl = new URL(
            `https://graph.facebook.com/v19.0/${campaign.meta_campaign_id}/insights`
          );
          metaUrl.searchParams.set('fields', fields);
          metaUrl.searchParams.set(
            'time_range',
            JSON.stringify({ since: dateStart, until: dateEnd })
          );
          metaUrl.searchParams.set('access_token', integration.access_token);

          const metaRes = await fetch(metaUrl.toString());
          const metaData = await metaRes.json();

          if (metaData.error || !metaData.data?.[0]) continue;

          const data = metaData.data[0];
          acc.count++;

          acc.impressions += parseFloat(data.impressions ?? '0');
          acc.reach += parseFloat(data.reach ?? '0');
          acc.clicks += parseFloat(data.clicks ?? '0');
          acc.spend += parseFloat(data.spend ?? '0');
          acc.cpm_sum += parseFloat(data.cpm ?? '0');
          acc.cpc_sum += parseFloat(data.cpc ?? '0');
          acc.ctr_sum += parseFloat(data.ctr ?? '0');
          acc.frequency_sum += parseFloat(data.frequency ?? '0');
          acc.conv_values += parseFloat(data.conversion_values ?? '0');
          acc.video3s += parseFloat(
            data.video_30_sec_watched_actions?.[0]?.value ?? '0'
          );
          acc.roas += parseFloat(data.purchase_roas?.[0]?.value ?? '0');
          acc.outbound_ctr_sum += parseFloat(data.outbound_clicks_ctr?.[0]?.value ?? '0');
          acc.outbound_cpc_sum += parseFloat(data.cost_per_outbound_click?.[0]?.value ?? '0');

          for (const action of data.actions ?? []) {
            acc.actions[action.action_type] =
              (acc.actions[action.action_type] ?? 0) +
              parseFloat(action.value ?? '0');
          }

          const conversas = parseFloat(
            (data.actions ?? []).find(
              (action: { action_type: string; value?: string }) =>
                action.action_type ===
                'onsite_conversion.messaging_conversation_started_7d'
            )?.value ?? '0'
          );
          conversasPorCampanha.push(Math.round(conversas));

          for (const cost of data.cost_per_action_type ?? []) {
            acc.costs[cost.action_type] =
              (acc.costs[cost.action_type] ?? 0) +
              parseFloat(cost.value ?? '0');
          }
        }

        if (acc.count > 0) {
          const getAction = (key: string) =>
            acc.actions[key] > 0 ? String(acc.actions[key]) : null;
          const getCost = (key: string) =>
            acc.costs[key] > 0 ? String(acc.costs[key] / acc.count) : null;

          const fmtBRL = (value: unknown) =>
            value
              ? parseFloat(String(value)).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              : '—';
          const fmtNum = (value: unknown) =>
            value
              ? Math.round(parseFloat(String(value))).toLocaleString('pt-BR')
              : '—';
          const fmtDec = (value: unknown) =>
            value ? parseFloat(String(value)).toFixed(2).replace('.', ',') : '—';
          const fmtPct = (value: unknown) =>
            value
              ? `${parseFloat(String(value)).toFixed(2).replace('.', ',')}%`
              : '—';

          const cpmMedio = acc.cpm_sum / acc.count;
          const cpcMedio = acc.cpc_sum / acc.count;
          const ctrMedio = acc.ctr_sum / acc.count;
          const frequenciaMedia = acc.frequency_sum / acc.count;
          const roasMedio = acc.roas / acc.count;
          const granaNoBolso = acc.conv_values - acc.spend;
          const taxaGancho =
            acc.impressions > 0 ? (acc.video3s / acc.impressions) * 100 : 0;
          const ctrLinkMedio = acc.outbound_ctr_sum / acc.count;
          const cpcLinkMedio = acc.outbound_cpc_sum / acc.count;

          const resultValue =
            getAction('onsite_conversion.messaging_conversation_started_7d') ||
            getAction('lead') ||
            getAction('purchase');
          const resultCost =
            getCost('onsite_conversion.messaging_conversation_started_7d') ||
            getCost('lead') ||
            getCost('purchase');

          const convWhats = Number(getAction('onsite_conversion.messaging_conversation_started_7d') ?? 0);
          const convForm = Number(getAction('lead') ?? 0);
          const convPurchase = Number(getAction('purchase') ?? 0);
          const convTotal = convWhats + convForm + convPurchase;
          const taxaConv = acc.clicks > 0 ? (convTotal / acc.clicks) * 100 : 0;
          const ticketMedio = convPurchase > 0 ? acc.conv_values / convPurchase : 0;

          metaValues = {
            '<DATA>': `${formatarDataBR(dateStart)} a ${formatarDataBR(dateEnd)}`,
            '<CA>': nomeConta,
            '<DIAS_ATIVO>': String(diasAtivo),
            '<ORC>': '—',
            '<INV>': fmtBRL(acc.spend),
            '<IMP>': fmtNum(acc.impressions),
            '<ALCAN>': fmtNum(acc.reach),
            '<FREQ>': fmtDec(frequenciaMedia),
            '<CPM>': fmtBRL(cpmMedio),
            '<CPC>': fmtBRL(cpcMedio),
            '<CTR>': fmtPct(ctrMedio),
            '<RESULT>': fmtNum(resultValue),
            '<CPR>': fmtBRL(resultCost),
            '<ADD_CART>': fmtNum(getAction('add_to_cart')),
            '<CUSTO_ADD_CART>': fmtBRL(getCost('add_to_cart')),
            '<VIEW_DEST_SITE>': fmtNum(getAction('landing_page_view')),
            '<VIEW_DEST>': fmtNum(getAction('view_content')),
            '<CUSTO_VIEW_DEST>': fmtBRL(getCost('view_content')),
            '<INIC_COMPRA>': fmtNum(getAction('initiate_checkout')),
            '<CUSTO_INIC_COMPRA>': fmtBRL(getCost('initiate_checkout')),
            '<COMPRAS>': fmtNum(getAction('purchase')),
            '<CUSTO_COMPRA>': fmtBRL(getCost('purchase')),
            '<CONV_COMPRA>': fmtBRL(
              acc.conv_values > 0 ? acc.conv_values : null
            ),
            '<ROAS>':
              roasMedio > 0
                ? `${roasMedio.toFixed(2).replace('.', ',')}x`
                : '—',
            '<GRANA>': fmtBRL(granaNoBolso > 0 ? granaNoBolso : null),
            '<GANCHO>': fmtPct(taxaGancho > 0 ? taxaGancho : null),
            '<CLICKS>': fmtNum(acc.clicks),
            '<CONV_WHATS>': fmtNum(getAction('onsite_conversion.messaging_conversation_started_7d')),
            '<CONV_FORM>': fmtNum(getAction('lead')),
            '<CONV_TOTAL>': fmtNum(convTotal > 0 ? String(convTotal) : null),
            '<TAXA_CONV>': fmtPct(taxaConv > 0 ? taxaConv : null),
            '<TICKET_MEDIO>': fmtBRL(ticketMedio > 0 ? ticketMedio : null),
            '<LUCRO>': fmtBRL(granaNoBolso > 0 ? granaNoBolso : null),
            '<CTR_LINK>': fmtPct(ctrLinkMedio > 0 ? ctrLinkMedio : null),
            '<CPC_LINK>': fmtBRL(cpcLinkMedio > 0 ? cpcLinkMedio : null),
            ...Object.fromEntries(
              Array.from({ length: 10 }, (_, index) => [
                `<CAMP_${index + 1}>`,
                String(conversasPorCampanha[index] ?? 0),
              ])
            ),
          };
        }
      }
    }

    // Seguidores e visitas ao perfil do Instagram, independe de ter campanha
    // ativa (por isso fica fora do bloco acima), usa a conta do Instagram
    // vinculada à mesma conta de anúncios já conectada do cliente.
    if (integration?.access_token && clientAdAccountId) {
      const igMetrics = await getInstagramMetrics(clientAdAccountId, integration.access_token, dateStart, dateEnd);
      metaValues = { ...metaValues, '<IG_SEGUIDORES>': igMetrics.seguidores, '<IG_VISITAS>': igMetrics.visitas };
    }

    let mensagem = report.mensagem_template;

    for (const [variavel, valor] of Object.entries(metaValues)) {
      mensagem = mensagem.replaceAll(variavel, valor);
    }

    mensagem = mensagem.replace(/<[A-Z0-9_]+>/g, '—');

    return NextResponse.json({ mensagem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('Erro ao gerar mensagem do relatório:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function calcularPeriodo(
  periodo: string,
  dataInicio?: string,
  dataFim?: string
): { dateStart: string; dateEnd: string; diasAtivo: number } {
  const agoraBR = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );
  const hoje = agoraBR;
  const formatarData = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  switch (periodo) {
    case 'dia_anterior':
    case 'ontem': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return {
        dateStart: formatarData(ontem),
        dateEnd: formatarData(ontem),
        diasAtivo: 1,
      };
    }
    case 'hoje': {
      return {
        dateStart: formatarData(hoje),
        dateEnd: formatarData(hoje),
        diasAtivo: 1,
      };
    }
    case 'ultimos_15_dias': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 15);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(ontem),
        diasAtivo: 15,
      };
    }
    case 'personalizado': {
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const dias =
          Math.round(
            (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
        return { dateStart: dataInicio, dateEnd: dataFim, diasAtivo: dias };
      }

      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return {
        dateStart: formatarData(ontem),
        dateEnd: formatarData(ontem),
        diasAtivo: 1,
      };
    }
    case 'ultima_semana': {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 7);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(hoje),
        diasAtivo: 7,
      };
    }
    case 'ultimos_3_dias': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 3);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(ontem),
        diasAtivo: 3,
      };
    }
    case 'ultimos_7_dias': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 7);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(ontem),
        diasAtivo: 7,
      };
    }
    case 'ultimos_30_dias': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 30);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(ontem),
        diasAtivo: 30,
      };
    }
    case 'ultimo_mes': {
      const primeiroDia = new Date(
        hoje.getFullYear(),
        hoje.getMonth() - 1,
        1
      );
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return {
        dateStart: formatarData(primeiroDia),
        dateEnd: formatarData(ultimoDia),
        diasAtivo: ultimoDia.getDate(),
      };
    }
    default: {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 1);
      return {
        dateStart: formatarData(inicio),
        dateEnd: formatarData(hoje),
        diasAtivo: 1,
      };
    }
  }
}

function formatarDataBR(dateStr: string): string {
  const [ano, mes, dia] = dateStr.split('-');
  return `${dia}/${mes}/${ano}`;
}
