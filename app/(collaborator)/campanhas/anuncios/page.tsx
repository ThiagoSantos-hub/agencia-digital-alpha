'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Megaphone,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  Plug
} from 'lucide-react'

interface AdCampaign {
  id: string
  name: string
  status: string
  platform: 'meta' | 'google'
  budget: number | null
  start_date: string | null
  end_date: string | null
  collaborator_id: string
}

interface CollaboratorIntegration {
  meta_ads_connected: boolean
  google_ads_connected: boolean
}

export default function AnunciosPage() {
  const { user } = useAuth()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const [integration, setIntegration] = useState<CollaboratorIntegration | null>(null)
  const [metaCampaigns, setMetaCampaigns] = useState<AdCampaign[]>([])
  const [googleCampaigns, setGoogleCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        // 1. Buscar ID e integrações do colaborador
        const { data: collaborator } = await supabase
          .from('collaborators')
          .select('id, meta_ads_connected, google_ads_connected')
          .eq('user_id', user.id)
          .single()

        if (!collaborator) {
          setLoading(false)
          return
        }

        setCollaboratorId(collaborator.id)
        setIntegration({
          meta_ads_connected: collaborator.meta_ads_connected ?? false,
          google_ads_connected: collaborator.google_ads_connected ?? false,
        })

        // 2. Buscar campanhas Meta Ads do colaborador
        const { data: metaData } = await supabase
          .from('ad_campaigns')
          .select('*')
          .eq('collaborator_id', collaborator.id)
          .eq('platform', 'meta')
          .order('created_at', { ascending: false })

        setMetaCampaigns(metaData || [])

        // 3. Buscar campanhas Google Ads do colaborador
        const { data: googleData } = await supabase
          .from('ad_campaigns')
          .select('*')
          .eq('collaborator_id', collaborator.id)
          .eq('platform', 'google')
          .order('created_at', { ascending: false })

        setGoogleCampaigns(googleData || [])
      } catch (error) {
        console.error('Erro ao buscar campanhas de anúncios:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ativa':
        return { label: 'Ativa', color: 'text-emerald-400', icon: Megaphone, bg: 'bg-emerald-400/10' }
      case 'pausada':
        return { label: 'Pausada', color: 'text-amber-400', icon: PauseCircle, bg: 'bg-amber-400/10' }
      case 'finalizada':
        return { label: 'Finalizada', color: 'text-blue-400', icon: CheckCircle2, bg: 'bg-blue-400/10' }
      case 'planejamento':
        return { label: 'Planejamento', color: 'text-gray-400', icon: Clock, bg: 'bg-gray-400/10' }
      default:
        return { label: status, color: 'text-gray-400', icon: Clock, bg: 'bg-gray-400/10' }
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatBudget = (budget: number | null) => {
    if (budget === null || budget === undefined) return '—'
    return budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const noIntegration =
    integration !== null &&
    !integration.meta_ads_connected &&
    !integration.google_ads_connected

  const CampaignCard = ({ campaign }: { campaign: AdCampaign }) => {
    const status = getStatusInfo(campaign.status)
    const StatusIcon = status.icon

    return (
      <div className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl group hover:border-emerald-500/30 transition-all shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} ${status.color} text-[10px] font-black uppercase tracking-wider`}
          >
            <StatusIcon size={12} />
            {status.label}
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <h3 className="text-base font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors">
            {campaign.name}
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Orçamento: {formatBudget(campaign.budget)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1a3a24]">
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Início</p>
            <p className="text-xs text-gray-300">{formatDate(campaign.start_date)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Término</p>
            <p className="text-xs text-gray-300">{formatDate(campaign.end_date)}</p>
          </div>
        </div>
      </div>
    )
  }

  const SectionHeader = ({
    icon: Icon,
    title,
    color,
    bg,
  }: {
    icon: React.ElementType
    title: string
    color: string
    bg: string
  }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
        <Icon size={20} />
      </div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
  )

  return (
    <div className="p-8 space-y-10">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-white">Campanhas de Anúncios</h1>
        <p className="text-gray-400 text-sm mt-1">
          Visualize suas campanhas ativas no Meta Ads e Google Ads.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-gray-500 italic">
          Carregando campanhas...
        </div>
      )}

      {/* Sem integração configurada */}
      {!loading && noIntegration && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border-2 border-dashed border-[#1a3a24] rounded-2xl">
          <div className="p-4 rounded-2xl bg-emerald-500/10">
            <Plug size={32} className="text-emerald-400" />
          </div>
          <p className="text-gray-400 text-sm text-center max-w-sm">
            Configure sua integração em{' '}
            <span className="text-emerald-400 font-semibold">Integrações</span>{' '}
            para visualizar suas campanhas.
          </p>
        </div>
      )}

      {/* Conteúdo das seções */}
      {!loading && !noIntegration && (
        <>
          {/* Seção Meta Ads */}
          <section>
            <SectionHeader
              icon={TrendingUp}
              title="Meta Ads"
              color="text-blue-400"
              bg="bg-blue-400/10"
            />

            {!integration?.meta_ads_connected ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0f0c] border border-[#1a3a24] text-gray-500 text-sm">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                Configure sua integração em{' '}
                <span className="text-emerald-400 font-semibold">Integrações</span>{' '}
                para visualizar suas campanhas.
              </div>
            ) : metaCampaigns.length === 0 ? (
              <div className="py-10 text-center text-gray-500 italic border-2 border-dashed border-[#1a3a24] rounded-2xl">
                Nenhuma campanha Meta Ads encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metaCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </section>

          {/* Seção Google Ads */}
          <section>
            <SectionHeader
              icon={Megaphone}
              title="Google Ads"
              color="text-emerald-400"
              bg="bg-emerald-400/10"
            />

            {!integration?.google_ads_connected ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0f0c] border border-[#1a3a24] text-gray-500 text-sm">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                Configure sua integração em{' '}
                <span className="text-emerald-400 font-semibold">Integrações</span>{' '}
                para visualizar suas campanhas.
              </div>
            ) : googleCampaigns.length === 0 ? (
              <div className="py-10 text-center text-gray-500 italic border-2 border-dashed border-[#1a3a24] rounded-2xl">
                Nenhuma campanha Google Ads encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {googleCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
