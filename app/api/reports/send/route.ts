import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calcularProximoEnvio, calcularPeriodo } from '@/lib/reportSchedule';
import { dispatchWebhook } from '@/lib/webhookDispatch';

const EVO_URL = process.env.EVOLUTION_API_URL || '';
const EVO_KEY = process.env.EVOLUTION_API_KEY || '';

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`;
}

// Client de serviço (não de sessão): esta rota é chamada tanto pelo navegador (envio manual,
// com sessão) quanto pelo cron do Postgres em 020_reports_cron.sql (net.http_post, sem sessão
// nenhuma). Usar o client de sessão aqui fazia o RLS bloquear silenciosamente toda leitura de
// `reports` nas chamadas do cron — por isso os relatórios automáticos nunca disparavam, só o
// envio manual (que tinha sessão de navegador) funcionava.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { report_id, preview } = await request.json();
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

    const { dateStart, dateEnd, diasAtivo } = calcularPeriodo(report.periodo, report.data_inicio, report.data_fim);

    // Resolve a empresa dona do relatório — sem isso a busca abaixo pegaria a
    // integração 'meta_ads' de QUALQUER empresa conectada no sistema (a primeira
    // que o Postgres retornasse), vazando token/gasto de uma empresa pro relatório de outra.
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
            // fallback: client.name já definido acima
          }
        }
      }
    }

    let metaValues: Record<string, string> = {};
    const debugActions: Record<string, string[]> = {};

    if (integration?.access_token && report.client_id) {
      // Sem filtro de status: uma campanha pausada/finalizada depois do período
      // do relatório ainda pode ter gerado resultados dentro da data selecionada
      // — quem decide se ela entra é a própria chamada de insights abaixo (pula
      // silenciosamente quem não tem dados no período).
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, meta_campaign_id')
        .eq('client_id', report.client_id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (campaigns && campaigns.length > 0) {
        const acc = {
          impressions: 0, reach: 0, clicks: 0, spend: 0,
          cpm_sum: 0, cpc_sum: 0, ctr_sum: 0, frequency_sum: 0,
          conv_values: 0, video3s: 0,
          actions: {} as Record<string, number>,
          costs: {} as Record<string, number>,
          roas: 0,
          count: 0,
        };
        const conversasPorCampanha: number[] = [];

        for (const campaign of campaigns) {
          if (!campaign.meta_campaign_id) {
            conversasPorCampanha.push(0);
            continue;
          }
          const fields = 'impressions,reach,clicks,ctr,spend,cpm,cpc,frequency,actions,cost_per_action_type,purchase_roas,conversion_values,video_30_sec_watched_actions';
          const metaUrl = new URL(`https://graph.facebook.com/v19.0/${campaign.meta_campaign_id}/insights`);
          metaUrl.searchParams.set('fields', fields);
          metaUrl.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }));
          metaUrl.searchParams.set('access_token', integration.access_token);

          const metaRes = await fetch(metaUrl.toString());
          const metaData = await metaRes.json();

          if (metaData.error || !metaData.data?.[0]) continue;

          const d = metaData.data[0];
          acc.count++;

          acc.impressions   += parseFloat(d.impressions  ?? '0');
          acc.reach         += parseFloat(d.reach        ?? '0');
          acc.clicks        += parseFloat(d.clicks       ?? '0');
          acc.spend         += parseFloat(d.spend        ?? '0');
          acc.cpm_sum       += parseFloat(d.cpm          ?? '0');
          acc.cpc_sum       += parseFloat(d.cpc          ?? '0');
          acc.ctr_sum       += parseFloat(d.ctr          ?? '0');
          acc.frequency_sum += parseFloat(d.frequency    ?? '0');
          acc.conv_values   += parseFloat(d.conversion_values ?? '0');
          acc.video3s       += parseFloat(d.video_30_sec_watched_actions?.[0]?.value ?? '0');
          acc.roas          += parseFloat(d.purchase_roas?.[0]?.value ?? '0');

          for (const action of (d.actions ?? [])) {
            acc.actions[action.action_type] = (acc.actions[action.action_type] ?? 0) + parseFloat(action.value ?? '0');
          }

          debugActions[campaign.meta_campaign_id] = (d.actions ?? []).map((a: any) => `${a.action_type}=${a.value}`);

          const convCampanha = parseFloat(
            (d.actions ?? []).find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value ?? '0'
          );
          conversasPorCampanha.push(Math.round(convCampanha));

          for (const cost of (d.cost_per_action_type ?? [])) {
            acc.costs[cost.action_type] = (acc.costs[cost.action_type] ?? 0) + parseFloat(cost.value ?? '0');
          }
        }

        if (acc.count > 0) {
          const getAction = (key: string) => acc.actions[key] > 0 ? String(acc.actions[key]) : null;
          const getCost   = (key: string) => acc.costs[key]   > 0 ? String(acc.costs[key] / acc.count) : null;

          const fmtBRL = (v: any) =>
            v ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
          const fmtNum = (v: any) =>
            v ? Math.round(parseFloat(v)).toLocaleString('pt-BR') : '—';
          const fmtDec = (v: any) =>
            v ? parseFloat(v).toFixed(2).replace('.', ',') : '—';
          const fmtPct = (v: any) =>
            v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';

          const cpmMedio      = acc.cpm_sum       / acc.count;
          const cpcMedio      = acc.cpc_sum       / acc.count;
          const ctrMedio      = acc.ctr_sum       / acc.count;
          const frequenciaMed = acc.frequency_sum / acc.count;
          const roasMedio     = acc.roas          / acc.count;

          const granaNoB   = acc.conv_values - acc.spend;
          const taxaGancho = acc.impressions > 0 ? (acc.video3s / acc.impressions) * 100 : 0;

          const resultValue =
            getAction('onsite_conversion.messaging_conversation_started_7d') ||
            getAction('lead') ||
            getAction('purchase');
          const resultCost =
            getCost('onsite_conversion.messaging_conversation_started_7d') ||
            getCost('lead') ||
            getCost('purchase');

          metaValues = {
            '<DATA>':              `${formatarDataBR(dateStart)} a ${formatarDataBR(dateEnd)}`,
            '<CA>':                nomeConta,
            '<DIAS_ATIVO>':        String(diasAtivo),
            '<ORC>':               '—',
            '<INV>':               fmtBRL(acc.spend),
            '<IMP>':               fmtNum(acc.impressions),
            '<ALCAN>':             fmtNum(acc.reach),
            '<FREQ>':              fmtDec(frequenciaMed),
            '<CPM>':               fmtBRL(cpmMedio),
            '<CPC>':               fmtBRL(cpcMedio),
            '<CTR>':               fmtPct(ctrMedio),
            '<RESULT>':            fmtNum(resultValue),
            '<CPR>':               fmtBRL(resultCost),
            '<ADD_CART>':          fmtNum(getAction('add_to_cart')),
            '<CUSTO_ADD_CART>':    fmtBRL(getCost('add_to_cart')),
            '<VIEW_DEST_SITE>':    fmtNum(getAction('landing_page_view')),
            '<VIEW_DEST>':         fmtNum(getAction('view_content')),
            '<CUSTO_VIEW_DEST>':   fmtBRL(getCost('view_content')),
            '<INIC_COMPRA>':       fmtNum(getAction('initiate_checkout')),
            '<CUSTO_INIC_COMPRA>': fmtBRL(getCost('initiate_checkout')),
            '<COMPRAS>':           fmtNum(getAction('purchase')),
            '<CUSTO_COMPRA>':      fmtBRL(getCost('purchase')),
            '<CONV_COMPRA>':       fmtBRL(acc.conv_values > 0 ? acc.conv_values : null),
            '<ROAS>':              roasMedio > 0 ? `${roasMedio.toFixed(2).replace('.', ',')}x` : '—',
            '<GRANA>':             fmtBRL(granaNoB > 0 ? granaNoB : null),
            '<GANCHO>':            fmtPct(taxaGancho > 0 ? taxaGancho : null),
            ...Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [
                `<CAMP_${i + 1}>`,
                String(conversasPorCampanha[i] ?? 0),
              ])
            ),
          };
        }
      }
    }

    // Seguidores e visitas ao perfil do Instagram — independe de ter campanha
    // ativa (por isso fica fora do bloco acima), usa a conta do Instagram
    // vinculada à mesma conta de anúncios já conectada do cliente.
    if (integration?.access_token && clientAdAccountId) {
      const igMetrics = await getInstagramMetrics(clientAdAccountId, integration.access_token, dateStart, dateEnd);
      metaValues = { ...metaValues, '<IG_SEGUIDORES>': igMetrics.seguidores, '<IG_VISITAS>': igMetrics.visitas };
    }

    let mensagemFinal = report.mensagem_template;
    for (const [variavel, valor] of Object.entries(metaValues)) {
      mensagemFinal = mensagemFinal.replaceAll(variavel, valor);
    }
    mensagemFinal = mensagemFinal.replace(/<[A-Z_]+>/g, '—');

    // Modo de pré-visualização: usado pelo pop-up de confirmação antes do envio
    // manual — monta a mensagem real com os dados já buscados, mas não envia
    // pro WhatsApp nem grava histórico.
    if (preview) {
      return NextResponse.json({
        mensagem: mensagemFinal,
        recebedor_tipo: report.recebedor_tipo,
        recebedor_numero: report.recebedor_numero,
      });
    }

    let status: 'enviado' | 'erro' = 'enviado';
    let erroDetalhe = null;

    const evoCan = EVO_URL && EVO_KEY;
    let enviouViaEvo = false;

    // Resolve a instância de WhatsApp dona do envio ANTES de decidir o caminho —
    // precisa estar disponível tanto pro envio direto (Evolution API) quanto pro
    // fallback via n8n, senão o fallback não tem como saber de qual empresa é o
    // envio e cai numa instância fixa (era exatamente esse o bug: o workflow
    // "Disparo de Relatório WhatsApp" usava uma instância hardcoded, então
    // relatório de qualquer empresa saía pelo WhatsApp da Digital Alpha).
    let senderId = report.user_id;
    if (report.enviar_via_agencia) {
      // Filtra pela MESMA empresa do relatório — sem isso pegava "o primeiro
      // admin encontrado no sistema inteiro", podendo disparar pelo WhatsApp
      // do admin de outra empresa.
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('company_id', reportCompanyId)
        .maybeSingle();
      if (adminProfile) senderId = adminProfile.id;
    }

    const { data: wpInstance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, status')
      .eq('user_id', senderId)
      .maybeSingle();

    if (evoCan && wpInstance?.status === 'connected' && wpInstance.instance_name) {
      try {
        const instName = wpInstance.instance_name;
        const evoBody = { number: report.recebedor_numero, text: mensagemFinal };

        const evoRes = await fetch(`${EVO_URL}/message/sendText/${instName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
          body: JSON.stringify(evoBody),
        });

        const evoData = await evoRes.json();

        if (evoRes.ok && !evoData.error) {
          enviouViaEvo = true;
        } else {
          erroDetalhe = evoData?.message || 'Erro na Evolution API';
        }
      } catch (evoErr: any) {
        erroDetalhe = evoErr.message;
      }
    }

    if (!enviouViaEvo) {
      const n8nWebhookUrl = 'https://webhook.digitalalpha.cloud/webhook/disparo-relatorio';
      try {
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_id: report.id,
            nome: report.nome,
            recebedor_numero: report.recebedor_numero,
            recebedor_tipo: report.recebedor_tipo,
            mensagem: mensagemFinal,
            // Instância da empresa dona do relatório — o workflow "Disparo de
            // Relatório WhatsApp" precisa usar ESTE campo em vez de uma
            // instância fixa, senão continua vazando pro WhatsApp errado.
            instance_name: wpInstance?.instance_name ?? null,
          }),
        });

        const responseData = await n8nResponse.json();
        if (!n8nResponse.ok) {
          status = 'erro';
          erroDetalhe = responseData?.message || 'Erro no N8N';
        } else {
          erroDetalhe = null;
        }
      } catch (fetchError: any) {
        status = 'erro';
        erroDetalhe = fetchError.message;
      }
    }

    const debugInfo = Object.keys(debugActions).length > 0
      ? `[DEBUG actions] ${JSON.stringify(debugActions)}`
      : null;

    await supabase.from('report_history').insert({
      report_id,
      status,
      mensagem_enviada: mensagemFinal,
      erro_detalhe: erroDetalhe ?? debugInfo,
    });

    if (status === 'enviado') {
      const proximoEnvio = calcularProximoEnvio(report.frequencia, report.horario_envio, report.dias_semana);
      await supabase.from('reports').update({ proximo_envio: proximoEnvio }).eq('id', report_id);

      if (reportCompanyId) {
        dispatchWebhook(reportCompanyId, 'relatorio.gerado', {
          report_id: report.id,
          nome: report.nome,
          client_id: report.client_id,
        }).catch(() => {});
      }
    }

    if (status === 'erro') {
      return NextResponse.json({ success: false, error: erroDetalhe }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Relatório enviado com sucesso' });

  } catch (error: any) {
    console.error('Erro na rota de envio:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


function formatarDataBR(dateStr: string): string {
  const [ano, mes, dia] = dateStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Seguidores e visitas ao perfil do Instagram, usando a conta do Instagram
// vinculada à mesma conta de anúncios do Meta Ads já conectada — não precisa
// de uma conexão separada. "Visitas ao perfil" é a métrica oficial do
// Instagram profile_views.
async function getInstagramMetrics(
  adAccountId: string,
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<{ seguidores: string; visitas: string }> {
  const fallback = { seguidores: '—', visitas: '—' };
  try {
    const igAccountsRes = await fetch(
      `https://graph.facebook.com/v19.0/${adAccountId}/instagram_accounts?access_token=${accessToken}`
    );
    const igAccountsData = await igAccountsRes.json();

    if (igAccountsData?.error) {
      console.error(`[getInstagramMetrics] erro ao buscar instagram_accounts de ${adAccountId}:`, igAccountsData.error.message ?? igAccountsData.error);
      return fallback;
    }
    const igAccountId = igAccountsData?.data?.[0]?.id;
    if (!igAccountId) {
      console.error(`[getInstagramMetrics] conta de anúncios ${adAccountId} não tem Instagram vinculado (instagram_accounts veio vazio)`);
      return fallback;
    }

    // follower_count = variação diária de seguidores (positiva ou negativa), não o
    // total da conta — somado no período dá os "novos seguidores" do intervalo do
    // relatório. metric_type=time_series é exigido pelas versões mais novas da API
    // quando se usa since/until com period=day (sem isso, o Instagram retornava
    // vazio sem erro explícito).
    const insightsRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=follower_count,profile_views&period=day&metric_type=time_series&since=${dateStart}&until=${dateEnd}&access_token=${accessToken}`
    );
    const insightsData = await insightsRes.json();

    if (insightsData?.error) {
      console.error(`[getInstagramMetrics] erro ao buscar insights de ${igAccountId}:`, insightsData.error.message ?? insightsData.error);
      return fallback;
    }

    const somaMetrica = (nome: string): number | null => {
      const item = insightsData?.data?.find((d: { name?: string }) => d.name === nome);
      if (!item) return null;
      const valores: Array<{ value?: number }> = item.values ?? [];
      return valores.reduce((soma, v) => soma + (v.value ?? 0), 0);
    };

    const novosSeguidores = somaMetrica('follower_count');
    const visitasTotal = somaMetrica('profile_views');

    const seguidores = novosSeguidores !== null ? novosSeguidores.toLocaleString('pt-BR') : '—';
    const visitas = visitasTotal !== null ? visitasTotal.toLocaleString('pt-BR') : '—';

    return { seguidores, visitas };
  } catch (err) {
    console.error('[getInstagramMetrics] falha ao buscar métricas do Instagram:', err);
    return fallback;
  }
}

