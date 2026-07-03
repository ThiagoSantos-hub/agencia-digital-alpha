'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCampanhas, Campaign, CampaignMetric } from '@/hooks/useCampanhas'
import { useClientes } from '@/hooks/useClientes'
import { Search, Megaphone, BarChart2, RefreshCw, Calendar, ExternalLink, Filter, AlertTriangle, ChevronDown, ChevronUp, User } from 'lucide-react'

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}

function CampaignCard({ campaign, fetchMetrics }: {
  campaign: Campaign
  fetchMetrics: (id: string, metaCampaignId: string) => Promise<CampaignMetric[]>
}) {
  const [expandido, setExpandido] = useState(false)
  const [metrics, setMetrics] = useState<CampaignMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  const loadMetrics = async () => {
    if (!expandido) {
      setLoadingMetrics(true)
      const data = await fetchMetrics(campaign.id, campaign.meta_campaign_id || '')
      setMetrics(data)
      setLoadingMetrics(false)
    }
    setExpandido(!expandido)
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.rascunho

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all shadow-xl">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
            <Megaphone size={22} />
          </div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{campaign.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
              <span className="text-gray-500 text-[10px]">ID: {campaign.meta_campaign_id || campaign.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Orçamento Diário</p>
            <p className="text-white font-semibold text-sm">
              {campaign.budget ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <button
            onClick={loadMetrics}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${expandido ? 'bg-indigo-600 text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
          >
            <BarChart2 size={14} />
            {expandido ? 'Ocultar Métricas' : 'Ver Métricas'}
          </button>
        </div>
      </div>

      {expandido && (
        <div className="px-5 pb-5 pt-2 border-t border-[#2a2a2a] bg-[#0f0f0f]/50">
          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-xs">
              <RefreshCw size={16} className="animate-spin text-indigo-500" /> Sincronizando dados reais do Meta Ads...
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs italic">Nenhuma métrica detalhada encontrada para esta campanha.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {metrics.map((m) => (
                <div key={m.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 shadow-sm">
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">{m.metric_label}</p>
                  <p className="text-white font-bold text-sm">{m.metric_value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <a
              href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-white transition-colors uppercase tracking-widest"
            >
              Abrir no Gerenciador <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function ClienteAccordion({ clienteId, clienteNome, campaigns, fetchMetrics, statusFilter, search }: {
  clienteId: string
  clienteNome: string
  campaigns: Campaign[]
  fetchMetrics: (id: string, metaCampaignId: string) => Promise<CampaignMetric[]>
  statusFilter: string
  search: string
}) {
  const [aberto, setAberto] = useState(false)

  const campanhasFiltradas = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'todas' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaigns, search, statusFilter])

  if (campanhasFiltradas.length === 0) return null

  const ativas = campanhasFiltradas.filter(c => c.status === 'ativa').length

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
      {/* Header do cliente */}
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <User size={16} className="text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">{clienteNome}</p>
            <p className="text-gray-500 text-xs">{campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? 's' : ''} • {ativas} ativa{ativas !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-indigo-400 text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
            {campanhasFiltradas.length}
          </span>
          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Campanhas do cliente */}
      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a2a] pt-4">
          {campanhasFiltradas.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              fetchMetrics={fetchMetrics}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CampanhasPage() {
  const { campaigns, loading, error, syncAllMetaCampaigns, fetchMetrics } = useCampanhas()
  const { clients } = useClientes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  // Agrupar campanhas por cliente
  const campanhasPorCliente = useMemo(() => {
    const grupos: Record<string, { nome: string; campaigns: Campaign[] }> = {}
    campaigns.forEach(c => {
      if (!grupos[c.client_id]) {
        const cliente = clients.find(cl => cl.id === c.client_id)
        grupos[c.client_id] = {
          nome: cliente?.name ?? `Cliente ${c.client_id.slice(0, 8)}`,
          campaigns: [],
        }
      }
      grupos[c.client_id].campaigns.push(c)
    })
    return grupos
  }, [campaigns, clients])

  const handleSync = async () => {
    setLocalError(null)
    try {
      await syncAllMetaCampaigns()
    } catch (err: any) {
      setLocalError(err.message || 'Falha na sincronização')
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Campanhas Ativas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Visualização direta de anúncios sincronizados com seu Meta Ads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${loading ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white'}`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Sincronizando...' : 'Sincronizar Meta'}
          </button>
        </div>
      </div>

      {(error || localError) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Erro na Sincronização</p>
            <p className="text-xs opacity-80">{error || localError}. Verifique sua conexão com o Meta Ads nas Integrações.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-[#1a1a1a] p-3 rounded-2xl border border-[#2a2a2a] shadow-lg">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar campanha pelo nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
          <Filter size={16} className="text-indigo-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
          >
            <option value="todas">Todos os Status</option>
            <option value="ativa">Ativas</option>
            <option value="pausada">Pausadas</option>
            <option value="finalizada">Finalizadas</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
          <Calendar size={16} className="text-indigo-400" />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none"
            style={{ colorScheme: 'dark' }}
          />
          <span className="text-gray-600">—</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-indigo-500" />
            <p className="text-gray-500 text-sm">Buscando campanhas no Meta Ads...</p>
          </div>
        ) : Object.keys(campanhasPorCliente).length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-20 text-center">
            <Megaphone size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-medium text-lg">Nenhuma campanha encontrada</h3>
            <p className="text-gray-500 text-sm mt-1">Verifique sua conexão com o Meta Ads ou tente outro filtro.</p>
          </div>
        ) : (
          Object.entries(campanhasPorCliente).map(([clienteId, { nome, campaigns: cams }]) => (
            <ClienteAccordion
              key={clienteId}
              clienteId={clienteId}
              clienteNome={nome}
              campaigns={cams}
              fetchMetrics={fetchMetrics}
              statusFilter={statusFilter}
              search={search}
            />
          ))
        )}
      </div>
    </div>
  )
}
