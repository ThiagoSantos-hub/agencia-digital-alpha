'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useMetaAccount } from '@/hooks/useMetaAccount'
import { useCampanhas, Campaign, CampaignMetric, MetaMetricOption } from '@/hooks/useCampanhas'
import { useClientes, Client } from '@/hooks/useClientes'
import {
  Search, Megaphone, BarChart2, RefreshCw, Calendar,
  ExternalLink, Filter, AlertTriangle, ChevronDown,
  ChevronUp, User, Settings2, X, Check, CreditCard,
  Wallet, PiggyBank,
} from 'lucide-react'

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}



const MetricSelectorModal = React.memo(function MetricSelectorModal({ campaign, allOptions, onSave, onClose }: {
  campaign: Campaign
  allOptions: MetaMetricOption[]
  onSave: (keys: string[]) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string[]>(campaign.selected_metrics ?? [])
  const [saving, setSaving] = useState(false)

  const toggle = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(selected)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-white font-bold text-sm">Configurar Métricas</h2>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[340px]">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-gray-500 text-xs mb-4">Selecione as métricas que deseja visualizar para esta campanha. A escolha fica salva até você editar novamente.</p>
          <div className="grid grid-cols-2 gap-2">
            {allOptions.map(opt => {
              const ativo = selected.includes(opt.key)
              return (
                <button key={opt.key} onClick={() => toggle(opt.key)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${ativo ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a]'}`}>
                  <span>{opt.label}</span>
                  {ativo && <Check size={12} className="text-emerald-400 shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? 'Salvando...' : `Salvar (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
)

const CampaignCard = React.memo(function CampaignCard({ campaign, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics, dateStart, dateEnd }: {
  campaign: Campaign
  fetchMetrics: (id: string, metaId: string, selected?: string[], start?: string, end?: string) => Promise<CampaignMetric[]>
  fetchAllMetricOptions: () => Promise<MetaMetricOption[]>
  saveSelectedMetrics: (id: string, keys: string[]) => Promise<boolean>
  dateStart: string
  dateEnd: string
}) {
  const [expandido, setExpandido] = useState(false)
  const [metrics, setMetrics] = useState<CampaignMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [allOptions, setAllOptions] = useState<MetaMetricOption[]>([])

  useEffect(() => {
    if (!expandido) return
    let cancelled = false
    const reload = async () => {
      setLoadingMetrics(true)
      const data = await fetchMetrics(campaign.id, campaign.meta_campaign_id || '', campaign.selected_metrics ?? undefined, dateStart || undefined, dateEnd || undefined)
      if (!cancelled) { setMetrics(data); setLoadingMetrics(false) }
    }
    reload()
    return () => { cancelled = true }
  }, [dateStart, dateEnd])

  const loadMetrics = async () => {
    if (!expandido) {
      setLoadingMetrics(true)
      const data = await fetchMetrics(campaign.id, campaign.meta_campaign_id || '', campaign.selected_metrics ?? undefined, dateStart || undefined, dateEnd || undefined)
      setMetrics(data)
      setLoadingMetrics(false)
    }
    setExpandido(!expandido)
  }

  const abrirConfig = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (allOptions.length === 0) {
      const opts = await fetchAllMetricOptions()
      setAllOptions(opts)
    }
    setModalAberto(true)
  }

  const handleSaveMetrics = async (keys: string[]) => {
    await saveSelectedMetrics(campaign.id, keys)
    if (expandido) {
      setLoadingMetrics(true)
      const data = await fetchMetrics(campaign.id, campaign.meta_campaign_id || '', keys, dateStart || undefined, dateEnd || undefined)
      setMetrics(data)
      setLoadingMetrics(false)
    }
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.rascunho

  return (
    <>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all shadow-xl">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
              <Megaphone size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{campaign.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.className}`}>{statusInfo.label}</span>
                <span className="text-gray-500 text-[10px]">ID: {campaign.meta_campaign_id || campaign.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Orçamento Diário</p>
              <p className="text-white font-semibold text-sm">{campaign.budget ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
            </div>
            <button onClick={abrirConfig} className="w-8 h-8 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] flex items-center justify-center text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all" title="Configurar métricas">
              <Settings2 size={14} />
            </button>
            <button onClick={loadMetrics} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${expandido ? 'bg-emerald-600 text-white' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}>
              <BarChart2 size={14} />
              {expandido ? 'Ocultar Métricas' : 'Ver Métricas'}
            </button>
          </div>
        </div>

        {expandido && (
          <div className="px-5 pb-5 pt-2 border-t border-[#2a2a2a] bg-[#0f0f0f]/50">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-xs">
                <RefreshCw size={16} className="animate-spin text-emerald-500" /> Buscando dados reais do Meta Ads...
              </div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-xs italic">
                Nenhuma métrica encontrada. Configure as métricas clicando no ícone <Settings2 size={11} className="inline" /> ao lado.
              </div>
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
              <a href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-white transition-colors uppercase tracking-widest">
                Abrir no Gerenciador <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>
      {modalAberto && (
        <MetricSelectorModal campaign={campaign} allOptions={allOptions} onSave={handleSaveMetrics} onClose={() => setModalAberto(false)} />
      )}
    </>
  )
}
)

const ClienteAccordion = React.memo(function ClienteAccordion({ clienteId, clienteNome, adAccountId, campaigns, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics, statusFilter, search, dateStart, dateEnd, onStatusDetected }: {
  clienteId: string
  clienteNome: string
  adAccountId: string | null
  campaigns: Campaign[]
  fetchMetrics: (id: string, metaId: string, selected?: string[], start?: string, end?: string) => Promise<CampaignMetric[]>
  fetchAllMetricOptions: () => Promise<MetaMetricOption[]>
  saveSelectedMetrics: (id: string, keys: string[]) => Promise<boolean>
  statusFilter: string
  search: string
  dateStart: string
  dateEnd: string
  onStatusDetected?: (bloqueada: boolean) => void
}) {
  const [aberto, setAberto] = useState(false)
  const { info: metaInfo, loading: metaLoading } = useMetaAccount(adAccountId)

  useEffect(() => {
    if (metaInfo && onStatusDetected) {
      onStatusDetected(metaInfo.contaBloqueada)
    }
  }, [metaInfo, onStatusDetected])

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
      <button onClick={() => setAberto(!aberto)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#1a1a1a] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <User size={16} className="text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className={`text-white font-medium ${metaInfo?.contaBloqueada ? 'text-red-400' : ''}`}>{clienteNome}</p>
              {metaInfo?.contaBloqueada && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">Conta bloqueada</span>
              )}
            </div>
            <p className="text-gray-500 text-xs">{campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? 's' : ''} • {ativas} ativa{ativas !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mr-4">
          {metaLoading ? (
            <RefreshCw size={12} className="animate-spin text-gray-600" />
          ) : metaInfo ? (
            <>
              {metaInfo.contaBloqueada && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 px-2.5 py-1 rounded-full">
                  <AlertTriangle size={11} className="text-red-400" />
                  <span className="text-red-400 text-[10px] font-bold">Conta Bloqueada</span>
                </div>
              )}
              {metaInfo.temCartao && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <CreditCard size={11} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">Cartão</span>
                </div>
              )}
              {metaInfo.saldo && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <Wallet size={11} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">Saldo: {metaInfo.saldo}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">{campanhasFiltradas.length}</span>
          {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a2a] pt-4">
          {campanhasFiltradas.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics} dateStart={dateStart} dateEnd={dateEnd} />
          ))}
        </div>
      )}
    </div>
  )
}
)

export default function CampanhasPage() {
  const { campaigns, loading, error, syncAllMetaCampaigns, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics } = useCampanhas()
  const { clients } = useClientes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [syncing, setSyncing] = useState(false)
  const [contasBloqueadas, setContasBloqueadas] = useState<Record<string, boolean>>({})

  // Filtro de data
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0])

  const handleSync = async () => {
    setSyncing(true)
    await syncAllMetaCampaigns()
    setSyncing(false)
  }

  const clientesComCampanhas = useMemo(() => {
    return clients
      .filter(c => c.show_campaigns !== false)
      .map(c => ({
        ...c,
        campaigns: campaigns.filter(camp => camp.client_id === c.id)
      }))
      .filter(c => c.campaigns.length > 0)
  }, [clients, campaigns])

  const totalBloqueadas = Object.values(contasBloqueadas).filter(Boolean).length

  return (
    <div className="p-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Campanhas</h1>
          <p className="text-gray-400 text-sm mt-1">Monitore o desempenho das campanhas do Meta Ads em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          {totalBloqueadas > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-red-400 text-xs font-bold">{totalBloqueadas} conta{totalBloqueadas !== 1 ? 's' : ''} com problemas</span>
            </div>
          )}
          <button onClick={handleSync} disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${syncing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white'}`}>
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Meta'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Buscar campanhas..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
        </div>

        <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3">
          <Filter size={16} className="text-emerald-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-transparent py-2.5 text-white text-sm focus:outline-none appearance-none cursor-pointer">
            <option value="todas">Todos os Status</option>
            <option value="ativa">Ativas</option>
            <option value="pausada">Pausadas</option>
            <option value="finalizada">Finalizadas</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3">
          <Calendar size={16} className="text-emerald-400" />
          <div className="flex items-center gap-2 flex-1">
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
              className="bg-transparent py-2.5 text-white text-xs focus:outline-none flex-1" />
            <span className="text-gray-600">à</span>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
              className="bg-transparent py-2.5 text-white text-xs focus:outline-none flex-1" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-emerald-500" />
            <p className="text-gray-500 text-sm">Buscando campanhas e clientes...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all">Tentar Novamente</button>
          </div>
        ) : clientesComCampanhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Megaphone size={48} className="mb-4 opacity-10" />
            <p>Nenhuma campanha encontrada para os filtros aplicados.</p>
          </div>
        ) : (
          clientesComCampanhas.map(c => (
            <ClienteAccordion 
              key={c.id} 
              clienteId={c.id} 
              clienteNome={c.name} 
              adAccountId={c.meta_ad_account_id}
              campaigns={c.campaigns} 
              fetchMetrics={fetchMetrics}
              fetchAllMetricOptions={fetchAllMetricOptions}
              saveSelectedMetrics={saveSelectedMetrics}
              statusFilter={statusFilter}
              search={search}
              dateStart={dateStart}
              dateEnd={dateEnd}
              onStatusDetected={(bloqueada) => setContasBloqueadas(prev => ({ ...prev, [c.id]: bloqueada }))}
            />
          ))
        )}
      </div>
    </div>
  )
}
