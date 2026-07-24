'use client'

import { useEffect, useState, useCallback } from 'react'
import { GrowthChart } from './GrowthChart'
import { MeetingMode } from './MeetingMode'
import {
  TrendingUp, Instagram, Target, Sparkles, Loader2,
  Presentation, Lock, RefreshCw, Users as UsersIcon,
} from 'lucide-react'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

const GRANULARITY_LABEL: Record<Granularity, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
}

interface GrowthResponse {
  granularity: Granularity
  metaAds: { date: string; impressions: number; reach: number; clicks: number; spend: number; leads: number; purchases: number }[]
  instagram: { date: string; followers_count: number | null; profile_views: number }[]
}

interface AiAnalysis {
  content: string
  generated_at: string
}

export function useAcompanhamentoData(clientId: string) {
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [growth, setGrowth] = useState<GrowthResponse | null>(null)
  const [loadingGrowth, setLoadingGrowth] = useState(true)
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const fetchGrowth = useCallback(async (g: Granularity) => {
    setLoadingGrowth(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/growth?granularity=${g}`)
      const data = await res.json()
      if (res.ok) setGrowth(data)
    } finally {
      setLoadingGrowth(false)
    }
  }, [clientId])

  const fetchAnalysis = useCallback(async () => {
    setLoadingAnalysis(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/ai-analysis`)
      const data = await res.json()
      if (res.ok && data) setAnalysis(data)
    } finally {
      setLoadingAnalysis(false)
    }
  }, [clientId])

  const gerarAnalise = useCallback(async () => {
    setGenerating(true)
    setAnalysisError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/ai-analysis`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setAnalysisError(data.error ?? 'Erro ao gerar diagnóstico.')
        return
      }
      setAnalysis(data)
    } finally {
      setGenerating(false)
    }
  }, [clientId])

  useEffect(() => { fetchGrowth(granularity) }, [granularity, fetchGrowth])
  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  return {
    granularity, setGranularity,
    growth, loadingGrowth,
    analysis, loadingAnalysis, generating, analysisError, gerarAnalise,
  }
}

function somarMeta(rows: GrowthResponse['metaAds']) {
  return rows.reduce((acc, r) => ({
    impressions: acc.impressions + r.impressions,
    clicks: acc.clicks + r.clicks,
    spend: acc.spend + r.spend,
    leads: acc.leads + r.leads,
  }), { impressions: 0, clicks: 0, spend: 0, leads: 0 })
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-muted text-[11px]">{label}</p>
      <p className="text-text-main text-base font-bold">{value}</p>
    </div>
  )
}

export function AcompanhamentoCards({
  data,
  size = 'normal',
}: {
  data: ReturnType<typeof useAcompanhamentoData>
  size?: 'normal' | 'large'
}) {
  const { granularity, setGranularity, growth, loadingGrowth, analysis, loadingAnalysis, generating, analysisError, gerarAnalise } = data
  const cardCls = `rounded-xl border border-border bg-surface ${size === 'large' ? 'p-8' : 'p-5'}`
  const titleCls = `text-text-main font-semibold flex items-center gap-2 ${size === 'large' ? 'text-xl mb-4' : 'text-sm mb-3'}`
  const iconSize = size === 'large' ? 20 : 16

  const totalMeta = growth ? somarMeta(growth.metaAds) : null
  const ultimoIg = growth?.instagram.filter((r) => r.followers_count != null).slice(-1)[0] ?? null
  const igSeries = growth?.instagram.filter((r) => r.followers_count != null).map((r) => ({ date: r.date, value: r.followers_count as number })) ?? []

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className={titleCls.replace('mb-4', '').replace('mb-3', '')}>
            <TrendingUp size={iconSize} className="text-primary" /> Crescimento
          </h3>
          <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
            {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  granularity === g ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {GRANULARITY_LABEL[g]}
              </button>
            ))}
          </div>
        </div>

        {loadingGrowth ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-text-muted" size={20} /></div>
        ) : (
          <GrowthChart
            points={(growth?.metaAds ?? []).map((r) => ({ date: r.date, value: r.spend }))}
            color="#6366f1"
            formatValue={(v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            height={size === 'large' ? 260 : 160}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cardCls}>
          <h3 className={titleCls}><Target size={iconSize} className="text-indigo-400" /> Meta Ads (período)</h3>
          {totalMeta ? (
            <div className="grid grid-cols-2 gap-4">
              <MetricStat label="Impressões" value={totalMeta.impressions.toLocaleString('pt-BR')} />
              <MetricStat label="Cliques" value={totalMeta.clicks.toLocaleString('pt-BR')} />
              <MetricStat label="Investido" value={`R$ ${totalMeta.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              <MetricStat label="Leads" value={totalMeta.leads.toLocaleString('pt-BR')} />
            </div>
          ) : (
            <p className="text-text-muted text-sm">Sem métricas no período.</p>
          )}
        </div>

        <div className={cardCls}>
          <h3 className={titleCls}><Instagram size={iconSize} className="text-pink-400" /> Instagram</h3>
          {igSeries.length > 0 ? (
            <GrowthChart points={igSeries} color="#ec4899" height={size === 'large' ? 200 : 120} />
          ) : (
            <p className="text-text-muted text-sm">
              Sem métricas de Instagram ainda. Elas aparecem automaticamente quando a conta de anúncios tiver um Instagram vinculado.
            </p>
          )}
          {ultimoIg && (
            <p className="text-text-muted text-xs mt-2">
              <UsersIcon size={11} className="inline mr-1" />
              {ultimoIg.followers_count?.toLocaleString('pt-BR')} seguidores atuais
            </p>
          )}
        </div>
      </div>

      <div className={cardCls}>
        <h3 className={titleCls}><Lock size={iconSize} className="text-text-disabled" /> Google Ads</h3>
        <p className="text-text-muted text-sm">
          Aguardando token de desenvolvedor do Google Ads. Assim que a conta MCC estiver configurada, as métricas aparecem aqui automaticamente.
        </p>
      </div>

      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className={titleCls.replace('mb-4', '').replace('mb-3', '')}><Sparkles size={iconSize} className="text-amber-400" /> Diagnóstico com IA</h3>
          <button
            onClick={gerarAnalise}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Gerar novo diagnóstico
          </button>
        </div>
        {analysisError && <p className="text-red-500 text-xs mb-2">{analysisError}</p>}
        {loadingAnalysis ? (
          <div className="flex items-center justify-center h-16"><Loader2 className="animate-spin text-text-muted" size={18} /></div>
        ) : analysis ? (
          <div>
            <p className={`text-text-main whitespace-pre-wrap leading-relaxed ${size === 'large' ? 'text-base' : 'text-sm'}`}>{analysis.content}</p>
            <p className="text-text-disabled text-[11px] mt-3">
              Gerado em {new Date(analysis.generated_at).toLocaleString('pt-BR')}
            </p>
          </div>
        ) : (
          <p className="text-text-muted text-sm">Nenhum diagnóstico gerado ainda. Clique em "Gerar novo diagnóstico".</p>
        )}
      </div>
    </div>
  )
}

export function AcompanhamentoCliente({ clientId, clientName }: { clientId: string; clientName: string }) {
  const data = useAcompanhamentoData(clientId)
  const [modoReuniao, setModoReuniao] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-text-main text-lg font-bold">Acompanhamento do Cliente</h2>
        <button
          onClick={() => setModoReuniao(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-text-muted bg-surface border border-border hover:text-text-main transition-colors"
        >
          <Presentation size={14} /> Modo Reunião
        </button>
      </div>

      <AcompanhamentoCards data={data} />

      {modoReuniao && (
        <MeetingMode clientName={clientName} onClose={() => setModoReuniao(false)}>
          <AcompanhamentoCards data={data} size="large" />
        </MeetingMode>
      )}
    </div>
  )
}
