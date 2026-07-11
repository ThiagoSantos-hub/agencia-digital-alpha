import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const EVO_URL = process.env.EVOLUTION_API_URL || '';
const EVO_KEY = process.env.EVOLUTION_API_KEY || '';

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`;
}

export async function POST(request: Request) {
  const supabase = createServerClient();

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

    const { dateStart, dateEnd, diasAtivo } = calcularPeriodo(report.periodo, report.data_inicio, report.data_fim);

    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle();

    let nomeConta = '—';
    if (report.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, meta_ad_account_id')
        .eq('id', report.client_id)
        .single();
      if (client) {
        nomeConta = client.name;
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
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, meta_campaign_id')
        .eq('client_id', report.client_id)
        .eq('status', 'ativa')
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

    let mensagemFinal = report.mensagem_template;
    for (const [variavel, valor] of Object.entries(metaValues)) {
      mensagemFinal = mensagemFinal.replaceAll(variavel, valor);
    }
    mensagemFinal = mensagemFinal.replace(/<[A-Z_]+>/g, '—');

    let status: 'enviado' | 'erro' = 'enviado';
    let erroDetalhe = null;

    const evoCan = EVO_URL && EVO_KEY;
    let enviouViaEvo = false;

    if (evoCan) {
      try {
        const { data: wpInstance } = await supabase
          .from('whatsapp_instances')
          .select('instance_name, status')
          .eq('user_id', report.user_id)
          .maybeSingle();

        if (wpInstance?.status === 'connected' && wpInstance.instance_name) {
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

function calcularPeriodo(periodo: string, dataInicio?: string, dataFim?: string): { dateStart: string; dateEnd: string; diasAtivo: number } {
  const agoraBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hoje = agoraBR;
  const fmt = (d: Date) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  switch (periodo) {
    case 'dia_anterior':
    case 'ontem': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return { dateStart: fmt(ontem), dateEnd: fmt(ontem), diasAtivo: 1 };
    }
    case 'personalizado': {
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const dias = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return { dateStart: dataInicio, dateEnd: dataFim, diasAtivo: dias };
      }
      // fallback: ontem
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return { dateStart: fmt(ontem), dateEnd: fmt(ontem), diasAtivo: 1 };
    }
    case 'ultima_semana': {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 7);
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 7 };
    }
    case 'ultimos_3_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 3);
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 3 };
    }
    case 'ultimos_7_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 7);
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 7 };
    }
    case 'ultimos_30_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 30);
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 30 };
    }
    case 'ultimo_mes': {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const dias = ultimoDia.getDate();
      return { dateStart: fmt(primeiroDia), dateEnd: fmt(ultimoDia), diasAtivo: dias };
    }
    default: {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 1);
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 1 };
    }
  }
}

function formatarDataBR(dateStr: string): string {
  const [ano, mes, dia] = dateStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function calcularProximoEnvio(frequencia: string, horario: string, diasSemana?: string[] | null): string {
  const agora = new Date();
  const [horas, minutos] = horario.split(':').map(Number);

  if (diasSemana && diasSemana.length > 0) {
    const diasNums = diasSemana.map(Number).sort((a, b) => a - b);
    let proximo = new Date();
    proximo.setHours(horas, minutos, 0, 0);
    for (let i = 1; i <= 7; i++) {
      const tentativa = new Date(proximo);
      tentativa.setDate(proximo.getDate() + i);
      if (diasNums.includes(tentativa.getDay()) && tentativa > agora) {
        return tentativa.toISOString();
      }
    }
  }

  let proximo = new Date();
  proximo.setHours(horas, minutos, 0, 0);
  if (proximo <= agora) {
    if (frequencia === 'diario') proximo.setDate(proximo.getDate() + 1);
    else if (frequencia === 'semanal') proximo.setDate(proximo.getDate() + 7);
    else if (frequencia === 'mensal') proximo.setMonth(proximo.getMonth() + 1);
  }

  return proximo.toISOString();
}
