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
