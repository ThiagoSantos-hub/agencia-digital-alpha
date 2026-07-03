'use client'

import { useState, useEffect } from 'react'
import { useCampanhas, Campaign, CampaignMetric, METRICS_DISPONIVEIS } from '@/hooks/useCampanhas'
import { useClientes } from '@/hooks/useClientes'
import { Search, Megaphone, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}

const channelConfig = {
  meta_ads:   { label: 'Meta Ads'   },
  google_ads: { label: 'Google Ads' },
  organico:   { label: 'Orgânico'   },
  outro:      { label: 'Outro'      },
}

function MetricasRow({ campaignId, fetchMetrics }: {
  campaignId: string
  fetchMetrics: (id: string) => Promise<CampaignMetric[]>
}) {
  const [metrics, setMetrics] = useState<CampaignMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics(campaignId).then((data) => {
      setMetrics(data)
      setLoading(false)
    })
  }, [campaignId, fetchMetrics])

  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="px-5 py-4 text-center text-gray-600 text-xs">
          Carregando métricas...
        </td>
      </tr>
    )
  }

  if (metrics.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-5 py-4 text-center text-gray-600 text-xs">
          Nenhuma métrica registrada para esta campanha.
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={6} className="px-5 py-4 bg-[#0f0f0f]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div
              key={m.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3"
            >
              <p className="text-gray-500 text-xs mb-1">{m.metric_label}</p>
              <p className="text-white font-semibold text-sm">
                {m.metric_value ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function CampanhasPage() {
  const { campaigns, loading, error, fetchMetrics } = useCampanhas()
  const { clients } = useClientes()

  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const clienteNome = (clientId: string) => {
    const c = clients.find((c) => c.id === clientId)
    return c ? (c.company ? `${c.name} — ${c.company}` : c.name) : '—'
  }

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      clienteNome(c.client_id).toLowerCase().includes(search.toLowerCase())

    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
    const matchCanal  = filtroCanal  === 'todos' || c.channel === filtroCanal

    const matchInicio = !dataInicio || (c.start_date && c.start_date >= dataInicio)
    const matchFim    = !dataFim    || (c.end_date   && c.end_date   <= dataFim)

    return matchSearch && matchStatus && matchCanal && matchInicio && matchFim
  })

  const toggleExpand = (id: string) => {
    setExpandido((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-bold">Campanhas</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {campaigns.length} {campaigns.length === 1 ? 'campanha' : 'campanhas'} — somente leitura
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Busca */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cliente..."
            className="pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
          />
        </div>

        {/* Filtro status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="todos">Todos os status</option>
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="finalizada">Finalizada</option>
          <option value="rascunho">Rascunho</option>
        </select>

        {/* Filtro canal */}
        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="todos">Todos os canais</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="google_ads">Google Ads</option>
          <option value="organico">Orgânico</option>
          <option value="outro">Outro</option>
        </select>

        {/* Período personalizado */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm">Período:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
          <span className="text-gray-500 text-sm">→</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
          {(dataInicio || dataFim) && (
            <button
              onClick={() => { setDataInicio(''); setDataFim('') }}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando campanhas...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">Erro: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Megaphone size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {campaigns.length === 0
                ? 'Nenhuma campanha sincronizada ainda.'
                : 'Nenhuma campanha encontrada com esses filtros.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-5 py-3 text-gray-500 font-medium">Campanha</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Canal</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Orçamento</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Métricas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((campaign) => {
                const statusInfo  = statusConfig[campaign.status]
                const channelInfo = channelConfig[campaign.channel]
                const aberto      = expandido === campaign.id

                return (
                  <>
                    <tr
                      key={campaign.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-white font-medium">{campaign.name}</p>
                        {campaign.start_date && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {new Date(campaign.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {campaign.end_date
                              ? ` → ${new Date(campaign.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}`
                              : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">{clienteNome(campaign.client_id)}</td>
                      <td className="px-5 py-3.5 text-gray-400">{channelInfo.label}</td>
                      <td className="px-5 py-3.5 text-gray-400">
                        {campaign.budget != null
                          ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleExpand(campaign.id)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          <BarChart2 size={14} />
                          {aberto ? 'Fechar' : 'Ver métricas'}
                          {aberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                    </tr>

                    {aberto && (
                      <MetricasRow
                        key={`metrics-${campaign.id}`}
                        campaignId={campaign.id}
                        fetchMetrics={fetchMetrics}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
