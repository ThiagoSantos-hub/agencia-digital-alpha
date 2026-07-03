'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCampanhas, Campaign, CampaignMetric } from '@/hooks/useCampanhas'
import { useClientes, Client } from '@/hooks/useClientes'
import { Search, Megaphone, ChevronDown, ChevronUp, BarChart2, Eye, EyeOff, RefreshCw, Calendar, ExternalLink, AlertCircle } from 'lucide-react'

const statusConfig = {
  ativa:      { label: 'Ativa',      className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pausada:    { label: 'Pausada',    className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'       },
  finalizada: { label: 'Finalizada', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'          },
  rascunho:   { label: 'Rascunho',   className: 'text-blue-400 bg-blue-500/10 border-blue-500/30'          },
}

function CampaignRow({ campaign, fetchMetrics }: { 
  campaign: Campaign
  fetchMetrics: (id: string) => Promise<CampaignMetric[]>
}) {
  const [expandido, setExpandido] = useState(false)
  const [metrics, setMetrics] = useState<CampaignMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  const loadMetrics = async () => {
    if (!expandido) {
      setLoadingMetrics(true)
      const data = await fetchMetrics(campaign.id)
      setMetrics(data)
      setLoadingMetrics(false)
    }
    setExpandido(!expandido)
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.rascunho

  return (
    <>
      <tr className="border-b border-[#2a2a2a]/50 last:border-0 hover:bg-white/[0.01] transition-colors">
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm">{campaign.name}</span>
            <span className="text-gray-500 text-[10px] mt-0.5">ID: {campaign.meta_campaign_id || campaign.id}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="text-gray-300 text-sm">
              {campaign.budget ? `R$ ${campaign.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </span>
            <span className="text-gray-500 text-[10px]">Orçamento</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="text-gray-300 text-sm">
              {campaign.start_date ? new Date(campaign.start_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
            </span>
            <span className="text-gray-500 text-[10px]">Início</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={loadMetrics}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <BarChart2 size={14} />
            {expandido ? 'Ocultar Métricas' : 'Ver Métricas'}
          </button>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={5} className="px-6 py-4 bg-[#0f0f0f]/50">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-4 gap-2 text-gray-500 text-xs">
                <RefreshCw size={14} className="animate-spin" /> Carregando dados do Meta Ads...
              </div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-4 text-gray-600 text-xs">Nenhuma métrica encontrada para este período.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {metrics.map((m) => (
                  <div key={m.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 shadow-sm">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">{m.metric_label}</p>
                    <p className="text-white font-semibold text-sm">{m.metric_value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function ClientCampaignSection({ client, campaigns, fetchMetrics, onToggleVisibility, onSync }: {
  client: Client
  campaigns: Campaign[]
  fetchMetrics: (id: string) => Promise<CampaignMetric[]>
  onToggleVisibility: (id: string, visible: boolean) => void
  onSync: (clientId: string, adAccountId: string) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!client.meta_ad_account_id) return
    setSyncing(true)
    await onSync(client.id, client.meta_ad_account_id)
    setSyncing(false)
  }

  if (!client.show_campaigns && !isOpen) {
    return (
      <div className="bg-[#1a1a1a]/40 border border-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-500">
            <EyeOff size={18} />
          </div>
          <div>
            <h3 className="text-gray-400 font-medium">{client.company || client.name}</h3>
            <p className="text-gray-600 text-xs">Oculto das análises</p>
          </div>
        </div>
        <button 
          onClick={() => onToggleVisibility(client.id, true)}
          className="p-2 text-gray-500 hover:text-white transition-colors"
        >
          <Eye size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl transition-all">
      <div 
        className={`p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors ${isOpen ? 'border-b border-[#2a2a2a]' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isOpen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#2a2a2a] text-gray-400'}`}>
            <Megaphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-lg">{client.company || client.name}</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase font-bold">
                {campaigns.length} Campanhas
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-2">
              Conta: {client.meta_ad_account_id || 'Não vinculada'}
              {!client.meta_ad_account_id && <AlertCircle size={12} className="text-amber-500" />}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {client.meta_ad_account_id && (
            <button 
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${syncing ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 hover:text-white'}`}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Meta'}
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(client.id, false) }}
            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
            title="Ocultar das análises"
          >
            <EyeOff size={18} />
          </button>
          <div className={`p-2 rounded-xl transition-colors ${isOpen ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600'}`}>
            {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1f1f1f]/50 border-b border-[#2a2a2a]">
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Campanha</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orçamento</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Início</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                    {syncing ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-indigo-500" />
                        Buscando campanhas no Meta Ads...
                      </div>
                    ) : (
                      <>Nenhuma campanha encontrada no Meta Ads para este cliente.</>
                    )}
                  </td>
                </tr>
              ) : (
                campaigns.map(c => (
                  <CampaignRow key={c.id} campaign={c} fetchMetrics={fetchMetrics} />
                ))
              )}
            </tbody>
          </table>
          <div className="p-4 bg-[#1f1f1f]/30 flex justify-end">
             <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
               Abrir no Gerenciador <ExternalLink size={12} />
             </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CampanhasPage() {
  const { campaigns, loading: loadingCamp, fetchMetrics, syncMetaCampaigns } = useCampanhas()
  const { clients, loading: loadingCli, updateCliente } = useClientes()
  
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const activeClients = useMemo(() => {
    return clients.filter(c => c.status === 'ativo' || c.status === 'atrasado')
  }, [clients])

  const filteredClients = useMemo(() => {
    return activeClients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
    )
  }, [activeClients, search])

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    await updateCliente(id, { show_campaigns: visible })
  }

  const handleSync = async (clientId: string, adAccountId: string) => {
    await syncMetaCampaigns(clientId, adAccountId)
  }

  if (loadingCli) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
        <p className="text-gray-400 text-sm">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Análise de Campanhas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Dados reais do Meta Ads sincronizados automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[#1a1a1a] p-2 rounded-2xl border border-[#2a2a2a]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] rounded-xl border border-[#2a2a2a]">
            <Calendar size={16} className="text-indigo-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-gray-600">—</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all w-48"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredClients.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-20 text-center">
            <Megaphone size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-medium">Nenhum cliente encontrado</h3>
            <p className="text-gray-500 text-sm mt-1">Tente ajustar sua busca ou verifique o status dos clientes.</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <ClientCampaignSection 
              key={client.id} 
              client={client} 
              campaigns={campaigns.filter(camp => camp.client_id === client.id)}
              fetchMetrics={fetchMetrics}
              onToggleVisibility={handleToggleVisibility}
              onSync={handleSync}
            />
          ))
        )}
      </div>
    </div>
  )
}
