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

    // 2. Buscar integração Evolution API
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('type', 'evolution_api')
      .single();

    if (integrationError || !integration) {
      const errorMsg = 'Evolution API não configurada em integrações';
      await supabase.from('report_history').insert({
        report_id,
        status: 'erro',
        mensagem_enviada: 'N/A',
        erro_detalhe: errorMsg
      });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const config = integration.config as any;
    const urlBase = config?.url;
    const apiKey = config?.api_key;
    const instance = config?.instance;

    if (!urlBase || !apiKey || !instance) {
      const errorMsg = 'Configurações da Evolution API incompletas (url, api_key ou instance ausentes)';
      await supabase.from('report_history').insert({
        report_id,
        status: 'erro',
        mensagem_enviada: 'N/A',
        erro_detalhe: errorMsg
      });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 3. Substituir variáveis (Fase 1: Valores de Exemplo)
    const dataAtual = new Intl.DateTimeFormat('pt-BR').format(new Date());
    let mensagemFinal = report.mensagem_template
      .replaceAll('<DATA>', dataAtual)
      .replaceAll('<ALCAN>', '—')
      .replaceAll('<IMP>', '—')
      .replaceAll('<CLIQ>', '—')
      .replaceAll('<CTR>', '—')
      .replaceAll('<LEADS>', '—')
      .replaceAll('<CPL>', '—')
      .replaceAll('<INV>', '—')
      .replaceAll('<ROAS>', '—')
      .replaceAll('<CPM>', '—')
      .replaceAll('<CONV>', '—')
      .replaceAll('<CA>', report.nome);

    // 4. Enviar mensagem via Evolution API
    let status: 'enviado' | 'erro' = 'enviado';
    let erroDetalhe = null;

    try {
      const evolutionResponse = await fetch(`${urlBase}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: report.recebedor_numero,
          text: mensagemFinal
        })
      });

      const responseData = await evolutionResponse.json();

      if (!evolutionResponse.ok) {
        status = 'erro';
        erroDetalhe = responseData?.message || 'Erro desconhecido na Evolution API';
      }
    } catch (fetchError: any) {
      status = 'erro';
      erroDetalhe = fetchError.message;
    }

    // 5. Registrar no histórico
    await supabase.from('report_history').insert({
      report_id,
      status,
      mensagem_enviada: mensagemFinal,
      erro_detalhe: erroDetalhe
    });

    // 6. Atualizar próximo envio
    if (status === 'enviado') {
      const proximoEnvio = calcularProximoEnvio(report.frequencia, report.horario_envio);
      await supabase
        .from('reports')
        .update({ proximo_envio: proximoEnvio })
        .eq('id', report_id);
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

// Função utilitária para calcular o próximo envio
function calcularProximoEnvio(frequencia: string, horario: string): string {
  const agora = new Date();
  const [horas, minutos] = horario.split(':').map(Number);
  let proximo = new Date();
  proximo.setHours(horas, minutos, 0, 0);

  // Se o horário já passou hoje, agenda para o próximo ciclo
  if (proximo <= agora) {
    if (frequencia === 'diario') {
      proximo.setDate(proximo.getDate() + 1);
    } else if (frequencia === 'semanal') {
      proximo.setDate(proximo.getDate() + 7);
    } else if (frequencia === 'mensal') {
      proximo.setMonth(proximo.getMonth() + 1);
    }
  } else {
    // Se o horário ainda não passou hoje, mas a frequência for semanal ou mensal,
    // o cálculo acima já cobre o "hoje".
  }

  return proximo.toISOString();
}
