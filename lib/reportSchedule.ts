// Lógica de "próximo envio" de relatórios agendados — antes duplicada (com
// pequenas divergências de edge-case) em hooks/useRelatorios.ts e
// app/api/reports/send/route.ts. Compartilhada aqui pra evitar os dois
// caminhos calcularem datas diferentes pro mesmo relatório.
export function calcularProximoEnvio(
  frequencia: string,
  horario: string,
  diasSemana?: string[] | null
): string | null {
  if (frequencia === 'manual') return null

  const agora = new Date()
  const [horas, minutos] = (horario || '08:00').split(':').map(Number)

  // Dias da semana específicos selecionados — acha o próximo dia válido
  // dentro dos próximos 8 dias (cobre o caso de hoje ainda não ter passado).
  if (diasSemana && Array.isArray(diasSemana) && diasSemana.length > 0) {
    const diasNums = diasSemana.map(Number).sort((a, b) => a - b)
    const base = new Date()
    base.setHours(horas, minutos, 0, 0)

    for (let i = 0; i <= 8; i++) {
      const tentativa = new Date(base)
      tentativa.setDate(base.getDate() + i)
      if (diasNums.includes(tentativa.getDay()) && tentativa > agora) {
        return tentativa.toISOString()
      }
    }
  }

  // Fallback: lógica padrão por frequência
  const proximo = new Date()
  proximo.setHours(horas, minutos, 0, 0)

  if (proximo <= agora) {
    if (frequencia === 'diario') proximo.setDate(proximo.getDate() + 1)
    else if (frequencia === 'semanal') proximo.setDate(proximo.getDate() + 7)
    else if (frequencia === 'mensal') proximo.setMonth(proximo.getMonth() + 1)
    else proximo.setDate(proximo.getDate() + 1)
  }

  return proximo.toISOString()
}

// Traduz o período escolhido no relatório (dia_anterior, ultima_semana, etc.)
// pro intervalo de datas real — usado tanto no envio (pra buscar os insights
// certos) quanto na tela de criação (pra saber quais campanhas do cliente
// caem dentro do período selecionado).
export function calcularPeriodo(
  periodo: string,
  dataInicio?: string | null,
  dataFim?: string | null
): { dateStart: string; dateEnd: string; diasAtivo: number } {
  const agoraBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const hoje = agoraBR
  const fmt = (d: Date) => {
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  switch (periodo) {
    case 'dia_anterior':
    case 'ontem': {
      const ontem = new Date(hoje)
      ontem.setDate(hoje.getDate() - 1)
      return { dateStart: fmt(ontem), dateEnd: fmt(ontem), diasAtivo: 1 }
    }
    case 'personalizado': {
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio)
        const fim = new Date(dataFim)
        const dias = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return { dateStart: dataInicio, dateEnd: dataFim, diasAtivo: dias }
      }
      const ontem = new Date(hoje)
      ontem.setDate(hoje.getDate() - 1)
      return { dateStart: fmt(ontem), dateEnd: fmt(ontem), diasAtivo: 1 }
    }
    case 'ultima_semana': {
      const inicio = new Date(hoje)
      inicio.setDate(hoje.getDate() - 7)
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 7 }
    }
    case 'ultimos_3_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 3)
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 3 }
    }
    case 'ultimos_7_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 7)
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 7 }
    }
    case 'ultimos_30_dias': {
      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
      const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 30)
      return { dateStart: fmt(inicio), dateEnd: fmt(ontem), diasAtivo: 30 }
    }
    case 'ultimo_mes': {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      return { dateStart: fmt(primeiroDia), dateEnd: fmt(ultimoDia), diasAtivo: ultimoDia.getDate() }
    }
    default: {
      const inicio = new Date(hoje)
      inicio.setDate(hoje.getDate() - 1)
      return { dateStart: fmt(inicio), dateEnd: fmt(hoje), diasAtivo: 1 }
    }
  }
}
