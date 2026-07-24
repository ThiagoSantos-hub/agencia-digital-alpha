'use client'

import { TrendingUp } from 'lucide-react'

interface Ponto {
  date: string
  value: number
}

// Gráfico de linha em SVG puro, no mesmo estilo artesanal de DonutChart/
// BarChart (app/(app)/dashboard/page.tsx), sem depender de nenhuma lib de
// chart nova.
export function GrowthChart({
  points,
  color = '#6366f1',
  height = 160,
  formatValue = (v: number) => v.toLocaleString('pt-BR'),
}: {
  points: Ponto[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
}) {
  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-text-muted" style={{ height }}>
        <TrendingUp size={28} className="mb-2 opacity-20" />
        <p className="text-xs">Sem dados no período</p>
      </div>
    )
  }

  const width = 600
  const padY = 16
  const values = points.map((p) => p.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const stepX = points.length > 1 ? width / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : width / 2
    const y = padY + (1 - (p.value - min) / range) * (height - padY * 2)
    return { x, y, value: p.value, date: p.date }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`

  const primeiro = points[0].value
  const ultimo = points[points.length - 1].value
  const variacao = primeiro > 0 ? (((ultimo - primeiro) / primeiro) * 100).toFixed(0) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-main text-lg font-bold">{formatValue(ultimo)}</span>
        {variacao !== null && (
          <span className={`text-xs font-semibold ${Number(variacao) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {Number(variacao) >= 0 ? '+' : ''}{variacao}% no período
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#growthFill)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-text-disabled">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  )
}
