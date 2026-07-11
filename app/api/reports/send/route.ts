import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = createServerClient();

  try {
    const { report_id } = await request.json();
    if (!report_id) {
      return NextResponse.json({ error: 'report_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar o relatório
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
    }

    // 2. Calcular datas do período
    const { dateStart, dateEnd, diasAtivo } = calcularPeriodo(report.periodo);

    // 3. Buscar token Meta Ads
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle();

    // 4. Buscar dados do cliente para pegar meta_ad_account_id
    let nomeConta = '—';
    let adAccountId: string | null = null;

    if (report.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name, meta_ad_account_id')
        .eq('id', report.client_id)
        .single();

      if (client) {
        nomeConta = client.name;
        adAccountId = client.meta_ad_account_id;
      }
    }

    // 5. Buscar métricas reais do Meta Ads
    let metaValues: Record<string, string> = {};

    if (integration?.access_token && adAccountId) {
      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      // Buscar insights da conta de anúncio no período
      const fields = 'impressions,reach,clicks,ctr,spend,cpm,cpc,frequency,actions,cost_per_action_type,purchase_roas,conversion_values,video_30_sec_watched_actions,budget_remaining';
      const metaUrl = new URL(`https://graph.facebook.com/v19.0/${accountId}/insights`);
      metaUrl.searchParams.set('fields', fields);
      metaUrl.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }));
      metaUrl.searchParams.set('access_token', integration.access_token);

      const metaRes = await fetch(metaUrl.toString());
      const metaData = await metaRes.json();

      if (!metaData.error && metaData.data?.[0]) {
        const d = metaData.data[0];

        const getAction = (key: string) =>
          d.actions?.find((a: any) => a.action_type === key)?.value ?? null;
        const getCost = (key: string) =>
          d.cost_per_action_type?.find((a: any) => a.action_type === key)?.value ?? null;

        const fmtBRL = (v: any) =>
          v ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
        const fmtNum = (v: any) =>
          v ? parseInt(v).toLocaleString('pt-BR') : '—';
        const fmtDec = (v: any) =>
          v ? parseFloat(v).toFixed(2).replace('.', ',') : '—';
        const fmtPct = (v: any) =>
          v ? `${parseFloat(v).toFixed(2).replace('.', ',')}%` : '—';

        const spend = d.spend ? parseFloat(d.spend) : 0;
        const convCompra = d.conversion_values ? parseFloat(d.conversion_values) : 0;
        const imp = d.impressions ? parseFloat(d.impressions) : 0;
        const video3s = d.video_30_sec_watched_actions?.[0]?.value
          ? parseFloat(d.video_30_sec_watched_actions[0].value) : 0;

        // Grana no Bolso = Valor de conversão da compra - Valor usado
        const granaNoB = convCompra - spend;
        // Taxa de Gancho = Reproduções 3s ÷ Impressões
        const taxaGancho = imp > 0 ? (video3s / imp) * 100 : 0;

        // Orçamento da conta
        const { data: accData } = await supabase
          .from('integrations')
          .select('access_token')
          .eq('type', 'meta_ads')
          .maybeSingle();

        metaValues = {
          '<DATA>': `${formatarDataBR(dateStart)} a ${formatarDataBR(dateEnd)}`,
          '<CA>': nomeConta,
          '<DIAS_ATIVO>': String(diasAtivo),
          '<ORC>': '—',
          '<INV>': fmtBRL(d.spend),
          '<IMP>': fmtNum(d.impressions),
          '<ALCAN>': fmtNum(d.reach),
          '<FREQ>': fmtDec(d.frequency),
          '<CPM>': fmtBRL(d.cpm),
          '<CPC>': fmtBRL(d.cpc),
          '<CTR>': fmtPct(d.ctr),
          '<RESULT>': fmtNum(getAction('lead') || getAction('purchase') || getAction('onsite_conversion.messaging_conversation_started_7d')),
          '<CPR>': fmtBRL(getCost('lead') || getCost('purchase') || getCost('onsite_conversion.messaging_conversation_started_7d')),
          '<SEG_IG>': fmtNum(getAction('follow')),
          '<VISIT_IG>': fmtNum(getAction('onsite_conversion.view_content')),
          '<ADD_CART>': fmtNum(getAction('add_to_cart')),
          '<CUSTO_ADD_CART>': fmtBRL(getCost('add_to_cart')),
          '<VIEW_DEST_SITE>': fmtNum(getAction('landing_page_view')),
          '<VIEW_DEST>': fmtNum(getAction('view_content')),
          '<CUSTO_VIEW_DEST>': fmtBRL(getCost('view_content')),
          '<INIC_COMPRA>': fmtNum(getAction('initiate_checkout')),
          '<CUSTO_INIC_COMPRA>': fmtBRL(getCost('initiate_checkout')),
          '<COMPRAS>': fmtNum(getAction('purchase')),
          '<CUSTO_COMPRA>': fmtBRL(getCost('purchase')),
          '<CONV_COMPRA>': fmtBRL(d.conversion_values),
          '<ROAS>': d.purchase_roas?.[0]?.value ? `${parseFloat(d.purchase_roas[0].value).toFixed(2).replace('.', ',')}x` : '—',
          '<GRANA>': fmtBRL(granaNoB > 0 ? granaNoB : 0),
          '<GANCHO>': fmtPct(taxaGancho > 0 ? taxaGancho : null),
        };
      }
    }

    // 6. Substituir variáveis no template
    let mensagemFinal = report.mensagem_template;
    for (const [variavel, valor] of Object.entries(metaValues)) {
      mensagemFinal = mensagemFinal.replaceAll(variavel, valor);
    }
    // Substituir variáveis não resolvidas por —
    mensagemFinal = mensagemFinal.replace(/<[A-Z_]+>/g, '—');

    // 7. Enviar para o N8N
    const n8nWebhookUrl = 'https://webhook.digitalalpha.cloud/webhook/disparo-relatorio';
    let status: 'enviado' | 'erro' = 'enviado';
    let erroDetalhe = null;

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
      }
    } catch (fetchError: any) {
      status = 'erro';
      erroDetalhe = fetchError.message;
    }

    // 8. Registrar no histórico
    await supabase.from('report_history').insert({
      report_id,
      status,
      mensagem_enviada: mensagemFinal,
      erro_detalhe: erroDetalhe,
    });

    // 9. Atualizar próximo envio
    if (status === 'enviado') {
      const proximoEnvio = calcularProximoEnvio(report.frequencia, report.horario_envio);
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

function calcularPeriodo(periodo: string): { dateStart: string; dateEnd: string; diasAtivo: number } {
  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (periodo) {
    case 'dia_anterior': {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      return { dateStart: fmt(ontem), dateEnd: fmt(ontem), diasAtivo: 1 };
    }
    case 'ultima_semana': {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 7);
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 7 };
    }
    case 'ultimos_7_dias': {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 7);
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 7 };
    }
    case 'ultimos_30_dias': {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - 30);
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 30 };
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

function calcularProximoEnvio(frequencia: string, horario: string): string {
  const agora = new Date();
  const [horas, minutos] = horario.split(':').map(Number);
  let proximo = new Date();
  proximo.setHours(horas, minutos, 0, 0);

  if (proximo <= agora) {
    if (frequencia === 'diario') proximo.setDate(proximo.getDate() + 1);
    else if (frequencia === 'semanal') proximo.setDate(proximo.getDate() + 7);
    else if (frequencia === 'mensal') proximo.setMonth(proximo.getMonth() + 1);
  }

  return proximo.toISOString();
}
