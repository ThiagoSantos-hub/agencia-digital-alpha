'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useMetaAccount } from '@/hooks/useMetaAccount'
import { useCampanhas, Campaign, CampaignMetric, MetaMetricOption } from '@/hooks/useCampanhas'
import { useClientes } from '@/hooks/useClientes'
import {
  Search, Megaphone, BarChart2, RefreshCw, Calendar,
  ExternalLink, Filter, AlertTriangle, ChevronDown,
  ChevronUp, User, Settings2, X, Check, CreditCard,
  Wallet,
} from 'lucide-react'

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-cta bg-cta/10 border-cta/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-700 bg-amber-50 border-amber-200' },
  finalizada: { label: 'Finalizada', className: 'text-text-muted bg-slate-100 border-slate-200' },
  rascunho:   { label: 'Rascunho',   className: 'text-primary bg-primary/10 border-primary/30' },
}

const MetricSelectorModal = React.memo(function MetricSelectorModal({ campaign, allOptions, onSave, onClose }: {
  campaign: Campaign
  allOptions: MetaMetricOption[]
  onSave: (keys: string[]) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string[]>(campaign.selected_metrics ?? [])
  const [saving, setSaving] = useState(false)
  const toggle = (key: string) => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  const handleSave = async () => { setSaving(true); await onSave(selected); setSaving(false); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-text-main font-bold text-sm">Configurar Métricas</h2>
            <p className="text-text-muted text-xs mt-0.5 truncate max-w-[340px]">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-text-muted text-xs mb-4">Selecione as métricas que deseja visualizar para esta campanha.</p>
          <div className="grid grid-cols-2 gap-2">
            {allOptions.map(opt => {
              const ativo = selected.includes(opt.key)
              return (
                <button key={opt.key} onClick={() => toggle(opt.key)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    ativo ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text-main hover:border-primary/30'
                  }`}>
                  <span>{opt.label}</span>
                  {ativo && <Check size={12} className="text-primary shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:text-text-main">Cancelar</button>
          <button onClick={handleSave} disabled={saving || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 shadow-sm">
            {saving ? 'Salvando...' : `Salvar (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
})

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
    if (allOptions.length === 0) setAllOptions(await fetchAllMetricOptions())
    setModalAberto(true)
  }

  const handleSaveMetrics = async (keys: string[]) => {
    await saveSelectedMetrics(campaign.id, keys)
    if (expandido) {
      setLoadingMetrics(true)
      setMetrics(await fetchMetrics(campaign.id, campaign.meta_campaign_id || '', keys, dateStart || undefined, dateEnd || undefined))
      setLoadingMetrics(false)
    }
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.rascunho

  return (
    <>
      <div className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all shadow-sm">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Megaphone size={22} /></div>
            <div>
              <h3 className="text-text-main font-bold text-base leading-tight">{campaign.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.className}`}>{statusInfo.label}</span>
                <span className="text-text-muted text-[10px]">ID: {campaign.meta_campaign_id || campaign.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Orçamento Diário</p>
              <p className="text-text-main font-semibold text-sm">{campaign.budget ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
            </div>
            <button onClick={abrirConfig} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30" title="Configurar métricas"><Settings2 size={14} /></button>
            <button onClick={loadMetrics} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${expandido ? 'bg-primary text-white' : 'bg-background border border-border text-text-muted hover:text-text-main'}`}>
              <BarChart2 size={14} />{expandido ? 'Ocultar Métricas' : 'Ver Métricas'}
            </button>
          </div>
        </div>
        {expandido && (
          <div className="px-5 pb-5 pt-2 border-t border-border bg-background/50">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-8 gap-2 text-text-muted text-xs"><RefreshCw size={16} className="animate-spin text-primary" /> Buscando dados reais do Meta Ads...</div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-8 text-text-disabled text-xs italic">Nenhuma métrica encontrada. Configure as métricas clicando no ícone <Settings2 size={11} className="inline" /> ao lado.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {metrics.map((m) => (
                  <div key={m.id} className="bg-surface border border-border rounded-xl p-3 shadow-sm">
                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1">{m.metric_label}</p>
                    <p className="text-text-main font-bold text-sm">{m.metric_value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {modalAberto && <MetricSelectorModal campaign={campaign} allOptions={allOptions} onSave={handleSaveMetrics} onClose={() => setModalAberto(false)} />}
    </>
  )
})

const ClienteAccordion = React.memo(function ClienteAccordion({ clienteNome, adAccountId, campaigns, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics, statusFilter, search, dateStart, dateEnd, onStatusDetected }: {
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
    if (metaInfo && onStatusDetected) onStatusDetected(metaInfo.contaBloqueada)
  }, [metaInfo, onStatusDetected])

  const campanhasFiltradas = useMemo(() => campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'todas' || c.status === statusFilter
    return matchesSearch && matchesStatus
  }), [campaigns, search, statusFilter])

  if (campanhasFiltradas.length === 0) return null
  const ativas = campanhasFiltradas.filter(c => c.status === 'ativa').length

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button onClick={() => setAberto(!aberto)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-hover-bg transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><User size={16} className="text-primary" /></div>
          <div className="text-left">
            <p className={`font-medium ${metaInfo?.contaBloqueada ? 'text-red-600' : 'text-text-main'}`}>{clienteNome}</p>
            <p className="text-text-muted text-xs">{campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? 's' : ''} • {ativas} ativa{ativas !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {metaLoading ? <RefreshCw size={12} className="animate-spin text-text-disabled" /> : metaInfo?.temCartao && (
            <span className="text-cta text-[10px] font-bold bg-cta/10 border border-cta/20 px-2.5 py-1 rounded-full flex items-center gap-1"><CreditCard size={11} /> Cartão</span>
          )}
          <span className="text-primary text-xs font-bold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">{campanhasFiltradas.length}</span>
          {aberto ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>
      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          {campanhasFiltradas.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics} dateStart={dateStart} dateEnd={dateEnd} />
          ))}
        </div>
      )}
    </div>
  )
})

export default function ColaboradorCampanhasPage() {
  const { campaigns, loading, error, syncAllMetaCampaigns, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics } = useCampanhas()
  const { clients } = useClientes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativa')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [blockedClientIds, setBlockedClientIds] = useState<Set<string>>(new Set())

  const handleStatusDetected = useCallback((clienteId: string, bloqueada: boolean) => {
    setBlockedClientIds(prev => {
      const next = new Set(prev)
      if (bloqueada) next.add(clienteId); else next.delete(clienteId)
      return next
    })
  }, [])

  const campanhasPorCliente = useMemo(() => {
    const grupos: Record<string, { nome: string; adAccountId: string | null; campaigns: Campaign[] }> = {}
    campaigns.forEach(c => {
      const cliente = clients.find(cl => cl.id === c.client_id)
      if (!cliente || cliente.status === 'inativo') return
      if (!grupos[c.client_id]) {
        grupos[c.client_id] = { nome: cliente.name ?? `Cliente ${c.client_id.slice(0, 8)}`, adAccountId: cliente.meta_ad_account_id ?? null, campaigns: [] }
      }
      grupos[c.client_id].campaigns.push(c)
    })
    return grupos
  }, [campaigns, clients])

  const { ativos, bloqueados } = useMemo(() => {
    const entries = Object.entries(campanhasPorCliente)
    return {
      ativos: entries.filter(([id]) => !blockedClientIds.has(id)),
      bloqueados: entries.filter(([id]) => blockedClientIds.has(id))
    }
  }, [campanhasPorCliente, blockedClientIds])

  const handleSync = async () => {
    setLocalError(null)
    try { await syncAllMetaCampaigns() } catch (err: any) { setLocalError(err.message || 'Falha na sincronização') }
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-text-main text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-text-muted text-sm mt-1">Visualização direta dos anúncios sincronizados com o Meta Ads da agência.</p>
        </div>
        <button onClick={handleSync} disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            loading ? 'bg-primary/15 text-primary' : 'bg-surface border border-border text-text-main hover:border-primary/40'
          }`}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Sincronizando...' : 'Sincronizar Meta'}
        </button>
      </div>

      {(error || localError) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-600">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Erro na Sincronização</p>
            <p className="text-xs opacity-80">{error || localError}</p>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-4 bg-surface/95 backdrop-blur-md p-3 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Buscar campanha pelo nome..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          {[{ value: 'todas', label: 'Todas' }, { value: 'ativa', label: 'Ativas' }, { value: 'pausada', label: 'Pausadas' }, { value: 'finalizada', label: 'Finalizadas' }].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === opt.value ? 'bg-primary text-white' : 'bg-background border border-border text-text-muted hover:text-text-main'
              }`}>{opt.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl">
          <Calendar size={16} className="text-primary" />
          <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-text-main text-sm focus:outline-none" />
          <span className="text-text-disabled">—</span>
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-text-main text-sm focus:outline-none" />
        </div>
      </div>

      <div className="space-y-10">
        {loading && campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={32} className="animate-spin text-primary" />
            <p className="text-text-muted text-sm">Buscando campanhas no Meta Ads...</p>
          </div>
        ) : Object.keys(campanhasPorCliente).length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-20 text-center">
            <Megaphone size={48} className="text-text-disabled mx-auto mb-4" />
            <h3 className="text-text-main font-medium text-lg">Nenhuma campanha encontrada</h3>
            <p className="text-text-muted text-sm mt-1">Verifique sua conexão com o Meta Ads ou tente outro filtro.</p>
          </div>
        ) : (
          <>
            {ativos.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-cta text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2"><span className="text-[8px]">●</span> Contas ativas</h2>
                <div className="grid grid-cols-1 gap-4">
                  {ativos.map(([clienteId, { nome, adAccountId, campaigns: cams }]) => (
                    <ClienteAccordion key={clienteId} clienteId={clienteId} clienteNome={nome} adAccountId={adAccountId} campaigns={cams}
                      fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics}
                      statusFilter={statusFilter} search={search} dateStart={dateStart} dateEnd={dateEnd}
                      onStatusDetected={(bloqueada) => handleStatusDetected(clienteId, bloqueada)} />
                  ))}
                </div>
              </div>
            )}
            {bloqueados.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-red-600 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2"><span className="text-[8px]">●</span> Contas bloqueadas</h2>
                <div className="grid grid-cols-1 gap-4">
                  {bloqueados.map(([clienteId, { nome, adAccountId, campaigns: cams }]) => (
                    <ClienteAccordion key={clienteId} clienteId={clienteId} clienteNome={nome} adAccountId={adAccountId} campaigns={cams}
                      fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics}
                      statusFilter={statusFilter} search={search} dateStart={dateStart} dateEnd={dateEnd}
                      onStatusDetected={(bloqueada) => handleStatusDetected(clienteId, bloqueada)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
