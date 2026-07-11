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

    // 2. Chamar o N8N via webhook
    const n8nWebhookUrl = 'https://webhook.digitalalpha.cloud/webhook/disparo-relatorio';

    let status: 'enviado' | 'erro' = 'enviado';
    let erroDetalhe = null;
    let mensagemFinal = report.mensagem_template;

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          nome: report.nome,
          recebedor_numero: report.recebedor_numero,
          recebedor_tipo: report.recebedor_tipo,
          mensagem_template: report.mensagem_template,
          frequencia: report.frequencia,
          horario_envio: report.horario_envio,
        })
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

    // 3. Registrar no histórico
    await supabase.from('report_history').insert({
      report_id,
      status,
      mensagem_enviada: mensagemFinal,
      erro_detalhe: erroDetalhe
    });

    // 4. Atualizar próximo envio
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
