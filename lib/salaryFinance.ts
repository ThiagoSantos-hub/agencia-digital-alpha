import type { SupabaseClient } from '@supabase/supabase-js'

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate()
}

function montarData(dia: number, ano: number, mes: number): string {
  const diaReal = Math.min(dia, ultimoDiaDoMes(ano, mes))
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`
}

// Próxima data em que esse dia do mês cai (hoje ou o próximo mês, se já passou).
function proximaOcorrencia(dia: number): string {
  const hoje = new Date()
  const diaHoje = hoje.getDate()
  if (dia >= diaHoje) return montarData(dia, hoje.getFullYear(), hoje.getMonth())
  const mesProx = hoje.getMonth() + 1 > 11 ? 0 : hoje.getMonth() + 1
  const anoProx = hoje.getMonth() + 1 > 11 ? hoje.getFullYear() + 1 : hoje.getFullYear()
  return montarData(dia, anoProx, mesProx)
}

// Segundo dia de pagamento do mês pra quem é quinzenal — 15 dias depois do
// primeiro, mantido numa faixa segura (1-28) pra não cair em dia inválido
// em mês mais curto.
function diaSeguinteQuinzena(dia: number): number {
  const outro = dia + 15
  return outro > 28 ? outro - 28 : outro
}

export interface GerarSalarioParams {
  collaboratorId: string
  collaboratorName: string
  companyId: string
  userId: string
  salary: number
  frequency: 'mensal' | 'quinzenal' | 'semanal'
  day: number
}

// Assim que um colaborador tem salário/frequência/dia cadastrados, gera a(s)
// conta(s) a pagar correspondente(s) no Financeiro. Se já existir um
// lançamento pendente pra esse colaborador, só atualiza o valor (não mexe na
// data, pra não bagunçar um pagamento já agendado).
export async function gerarOuAtualizarLancamentosSalario(
  supabase: SupabaseClient,
  params: GerarSalarioParams
): Promise<void> {
  const { collaboratorId, collaboratorName, companyId, userId, salary, frequency, day } = params

  const { data: existentes } = await supabase
    .from('finances')
    .select('id')
    .eq('collaborator_id', collaboratorId)
    .eq('status', 'pendente')

  const pendentes = existentes ?? []
  const esperado = frequency === 'quinzenal' ? 2 : 1

  // Já tem a quantidade certa de lançamentos pendentes pra frequência atual —
  // só atualiza o valor, sem mexer na data (pra não bagunçar pagamento já
  // agendado).
  if (pendentes.length === esperado) {
    await supabase
      .from('finances')
      .update({ valor: salary, updated_at: new Date().toISOString() })
      .eq('collaborator_id', collaboratorId)
      .eq('status', 'pendente')
    return
  }

  // Quantidade errada (frequência mudou de mensal/semanal pra quinzenal ou
  // vice-versa, ou nunca foi gerado) — apaga os pendentes antigos e gera do
  // zero pra frequência atual.
  if (pendentes.length > 0) {
    await supabase.from('finances').delete().eq('collaborator_id', collaboratorId).eq('status', 'pendente')
  }

  const base = {
    user_id: userId,
    company_id: companyId,
    escopo: 'agencia' as const,
    tipo: 'gasto' as const,
    categoria: 'Salários / colaboradores',
    descricao: `Salário - ${collaboratorName}`,
    valor: salary,
    status: 'pendente' as const,
    collaborator_id: collaboratorId,
    client_id: null,
    recorrente: true,
  }

  if (frequency === 'mensal') {
    await supabase.from('finances').insert({
      ...base,
      dia_vencimento: day,
      data_vencimento: proximaOcorrencia(day),
      recorrencia: 'mensal',
    })
  } else if (frequency === 'quinzenal') {
    // Salário é o valor total do mês, dividido nas duas parcelas quinzenais
    // (senão o total pago no mês dobraria).
    const metade = salary / 2
    const dia2 = diaSeguinteQuinzena(day)
    await supabase.from('finances').insert([
      { ...base, valor: metade, descricao: `${base.descricao} (quinzenal 1/2)`, dia_vencimento: day, data_vencimento: proximaOcorrencia(day), recorrencia: 'mensal' },
      { ...base, valor: metade, descricao: `${base.descricao} (quinzenal 2/2)`, dia_vencimento: dia2, data_vencimento: proximaOcorrencia(dia2), recorrencia: 'mensal' },
    ])
  } else {
    const proxima = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await supabase.from('finances').insert({
      ...base,
      dia_vencimento: proxima.getDate(),
      data_vencimento: proxima.toISOString().split('T')[0],
      recorrencia: 'semanal',
    })
  }
}
