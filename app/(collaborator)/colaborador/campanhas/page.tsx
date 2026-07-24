'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useMetaAccount } from '@/hooks/useMetaAccount'
import { useCampanhas, Campaign, CampaignMetric, MetaMetricOption } from '@/hooks/useCampanhas'
import { createClient } from '@/lib/supabase'
import { FeatureLock } from '@/components/ui/FeatureLock'
import {
  Search, Megaphone, BarChart2, RefreshCw, Calendar,
  ExternalLink, Filter, AlertTriangle, ChevronDown,
  ChevronUp, User, Settings2, X, Check, CreditCard,
  Wallet,
} from 'lucide-react'
import { calcularPeriodo } from '@/lib/reportSchedule'
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableMetricCard } from '@/components/campanhas/SortableMetricCard'

const PERIODO_OPTIONS = [
  { value: 'ontem', label: 'Ontem' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'ultimos_3_dias', label: 'Últ. 3 dias' },
  { value: 'ultimos_7_dias', label: 'Últ. 7 dias' },
  { value: 'ultimos_15_dias', label: 'Últ. 15 dias' },
  { value: 'ultimos_30_dias', label: 'Últ. 30 dias' },
  { value: 'personalizado', label: '📅 Custom' },
]

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-text-main font-bold text-sm">Configurar Métricas</h2>
            <p className="text-text-muted text-xs mt-0.5 truncate max-w-[340px]">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-text-muted text-xs mb-4">Selecione as métricas que deseja visualizar para esta campanha. A escolha fica salva até você editar novamente.</p>
          <div className="grid grid-cols-2 gap-2">
            {allOptions.map(opt => {
              const ativo = selected.includes(opt.key)
              return (
                <button key={opt.key} onClick={() => toggle(opt.key)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    ativo
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-surface border-border text-text-muted hover:text-text-main hover:border-primary/30'
                  }`}>
                  <span>{opt.label}</span>
                  {ativo && <Check size={12} className="text-primary shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:text-text-main transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm">
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Reordena os cards de métrica e salva a nova ordem em selected_metrics,
  // assim ela fica valendo da próxima vez que a campanha for aberta.
  const handleDragEndMetrics = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setMetrics(prev => {
      const oldIndex = prev.findIndex(m => m.metric_key === active.id)
      const newIndex = prev.findIndex(m => m.metric_key === over.id)
      const reordenado = arrayMove(prev, oldIndex, newIndex)
      saveSelectedMetrics(campaign.id, reordenado.map(m => m.metric_key))
      return reordenado
    })
  }

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
      <tr className="hover:bg-hover-bg transition-colors">
        <td className="px-4 py-3">
          <p className="text-text-main font-medium text-sm">{campaign.name}</p>
          <p className="text-text-disabled text-[10px] mt-0.5">ID: {campaign.meta_campaign_id || campaign.id}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.className}`}>{statusInfo.label}</span>
        </td>
        <td className="px-4 py-3 text-text-main text-sm">
          {campaign.budget ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <FeatureLock featureKey="campanhas.metricas_personalizadas" variant="replace">
              <button onClick={abrirConfig} className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/30 transition-all" title="Configurar métricas">
                <Settings2 size={14} />
              </button>
            </FeatureLock>
            <button onClick={loadMetrics} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              expandido
                ? 'bg-primary text-white'
                : 'bg-background border border-border text-text-muted hover:text-text-main'
            }`}>
              <BarChart2 size={14} />
              {expandido ? 'Ocultar' : 'Métricas'}
            </button>
          </div>
        </td>
      </tr>

      {expandido && (
        <tr>
          <td colSpan={4} className="px-4 pb-4 pt-1 bg-background/50 border-b border-border">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-8 gap-2 text-text-muted text-xs">
                <RefreshCw size={16} className="animate-spin text-primary" /> Buscando dados reais do Meta Ads...
              </div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-8 text-text-disabled text-xs italic">
                Nenhuma métrica encontrada. Configure as métricas clicando no ícone <Settings2 size={11} className="inline" /> ao lado.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndMetrics}>
                <SortableContext items={metrics.map(m => m.metric_key)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3">
                    {metrics.map((m) => (
                      <SortableMetricCard key={m.metric_key} metric={m} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            <div className="mt-4 flex justify-end">
              <a href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold text-text-disabled hover:text-text-main transition-colors uppercase tracking-widest">
                Abrir no Gerenciador <ExternalLink size={12} />
              </a>
            </div>
          </td>
        </tr>
      )}
      {modalAberto && (
        <MetricSelectorModal campaign={campaign} allOptions={allOptions} onSave={handleSaveMetrics} onClose={() => setModalAberto(false)} />
      )}
    </>
  )
})

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
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button onClick={() => setAberto(!aberto)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-hover-bg transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className={`font-medium ${metaInfo?.contaBloqueada ? 'text-red-600' : 'text-text-main'}`}>{clienteNome}</p>
              {metaInfo?.contaBloqueada && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Conta bloqueada</span>
              )}
            </div>
            <p className="text-text-muted text-xs">{campanhasFiltradas.length} campanha{campanhasFiltradas.length !== 1 ? 's' : ''} • {ativas} ativa{ativas !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mr-4">
          {metaLoading ? (
            <RefreshCw size={12} className="animate-spin text-text-disabled" />
          ) : metaInfo ? (
            <>
              {metaInfo.contaBloqueada && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                  <AlertTriangle size={11} className="text-red-600" />
                  <span className="text-red-600 text-[10px] font-bold">Conta Bloqueada</span>
                </div>
              )}
              {metaInfo.temCartao && (
                <div className="flex items-center gap-1.5 bg-cta/10 border border-cta/20 px-2.5 py-1 rounded-full">
                  <CreditCard size={11} className="text-cta" />
                  <span className="text-cta text-[10px] font-bold">Cartão</span>
                </div>
              )}
              {metaInfo.saldo && (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                  <Wallet size={11} className="text-primary" />
                  <span className="text-primary text-[10px] font-bold">Saldo: {metaInfo.saldo}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-primary text-xs font-bold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">{campanhasFiltradas.length}</span>
          {aberto ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-hover-bg">
                <th className="px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest">Campanha</th>
                <th className="px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest">Orçamento diário</th>
                <th className="px-4 py-3 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campanhasFiltradas.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics} dateStart={dateStart} dateEnd={dateEnd} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

interface ClienteDiretorio {
  id: string
  name: string
  status: 'ativo' | 'inativo' | 'atrasado'
  meta_ad_account_id: string | null
}

export default function ColaboradorCampanhasPage() {
  const { campaigns, loading, error, syncAllMetaCampaigns, fetchMetrics, fetchAllMetricOptions, saveSelectedMetrics } = useCampanhas()
  // clients_directory (não a tabela clients direto): RLS de clients agora só
  // libera o registro completo pra quem gerencia aquele cliente (ver
  // migration 20260731_clients_rls_hardening.sql). Essa tela só precisa de
  // nome/status/conta de anúncio pra agrupar campanhas de TODOS os clientes
  // da agência, não só os do próprio colaborador.
  const [clients, setClients] = useState<ClienteDiretorio[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('clients_directory')
      .select('id, name, status, meta_ad_account_id')
      .then(({ data }) => setClients(data ?? []))
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativa')
  const [periodoPreset, setPeriodoPreset] = useState('ultimos_30_dias')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [blockedClientIds, setBlockedClientIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (periodoPreset === 'personalizado') return
    const { dateStart: ds, dateEnd: de } = calcularPeriodo(periodoPreset)
    setDateStart(ds)
    setDateEnd(de)
  }, [periodoPreset])

  // IMPORTANTE: só atualiza o Set quando o valor realmente muda — evita loop infinito de re-render
  const handleStatusDetected = useCallback((clienteId: string, bloqueada: boolean) => {
    setBlockedClientIds(prev => {
      const next = new Set(prev)
      const had = next.has(clienteId)
      if (bloqueada && !had) {
        next.add(clienteId)
        return next
      } else if (!bloqueada && had) {
        next.delete(clienteId)
        return next
      }
      return prev
    })
  }, [])

  const campanhasPorCliente = useMemo(() => {
    const grupos: Record<string, { nome: string; adAccountId: string | null; campaigns: Campaign[] }> = {}
    campaigns.forEach(c => {
      const cliente = clients.find(cl => cl.id === c.client_id)
      if (!cliente || cliente.status === 'inativo') return
      if (!grupos[c.client_id]) {
        grupos[c.client_id] = {
          nome: cliente.name ?? `Cliente ${c.client_id.slice(0, 8)}`,
          adAccountId: cliente.meta_ad_account_id ?? null,
          campaigns: [],
        }
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
          <h1 className="text-text-main text-3xl font-bold tracking-tight">Campanhas Ativas</h1>
          <p className="text-text-muted text-sm mt-1">Visualização direta de anúncios sincronizados com seu Meta Ads.</p>
        </div>
        <FeatureLock featureKey="campanhas.sincronizar_meta" variant="replace">
          <button onClick={handleSync} disabled={loading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              loading
                ? 'bg-primary/15 text-primary'
                : 'bg-surface border border-border text-text-main hover:border-primary/40'
            }`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Sincronizando...' : 'Sincronizar Meta'}
          </button>
        </FeatureLock>
      </div>

      {(error || localError) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-600">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Erro na Sincronização</p>
            <p className="text-xs opacity-80">{error || localError}. Verifique sua conexão com o Meta Ads nas Integrações.</p>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-4 bg-surface/95 backdrop-blur-md p-3 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Buscar campanha pelo nome..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-primary" />
          {[
            { value: 'todas', label: 'Todas' },
            { value: 'ativa', label: 'Ativas' },
            { value: 'pausada', label: 'Pausadas' },
            { value: 'finalizada', label: 'Finalizadas' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border text-text-muted hover:text-text-main'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-primary" />
          {PERIODO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriodoPreset(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodoPreset === opt.value
                  ? 'bg-primary/10 border border-primary text-primary'
                  : 'bg-background border border-border text-text-muted hover:text-text-main'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {periodoPreset === 'personalizado' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl">
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-transparent text-text-main text-sm focus:outline-none" />
              <span className="text-text-disabled">—</span>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-transparent text-text-main text-sm focus:outline-none" />
            </div>
          )}
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
                <h2 className="text-cta text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[8px]">●</span> Contas ativas
                </h2>
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
              <>
                {ativos.length > 0 && <div className="border-t border-border my-8" />}
                <div className="space-y-4">
                  <h2 className="text-red-600 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="text-[8px]">●</span> Contas bloqueadas
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {bloqueados.map(([clienteId, { nome, adAccountId, campaigns: cams }]) => (
                      <ClienteAccordion key={clienteId} clienteId={clienteId} clienteNome={nome} adAccountId={adAccountId} campaigns={cams}
                        fetchMetrics={fetchMetrics} fetchAllMetricOptions={fetchAllMetricOptions} saveSelectedMetrics={saveSelectedMetrics}
                        statusFilter={statusFilter} search={search} dateStart={dateStart} dateEnd={dateEnd}
                        onStatusDetected={(bloqueada) => handleStatusDetected(clienteId, bloqueada)} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
