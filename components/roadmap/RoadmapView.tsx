'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  Rocket,
  LayoutDashboard,
  Users,
  BarChart2,
  Megaphone,
  Image as ImageIcon,
  Calendar,
  UserCog,
  FileSignature,
  Wallet,
  FolderOpen,
  Bell,
  BellRing,
  Settings,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  Wrench,
  AlertCircle,
} from 'lucide-react'

interface RoadmapFeature {
  id: string
  category: string
  name: string
  description: string
  benefits: string
  how_to_use: string
  problem_solved: string
  status: 'planejado' | 'em_desenvolvimento' | 'em_testes' | 'disponivel'
  display_order: number
}

const CATEGORY_ICONS: Record<string, typeof LayoutDashboard> = {
  'Dashboard': LayoutDashboard,
  'Clientes': Users,
  'Acompanhamento do Cliente': BarChart2,
  'Tráfego Pago': Megaphone,
  'Social Media': ImageIcon,
  'Agenda': Calendar,
  'Equipe': UserCog,
  'Contratos': FileSignature,
  'Financeiro': Wallet,
  'Biblioteca': FolderOpen,
  'Alertas': Bell,
  'Notificações': BellRing,
  'Configurações': Settings,
  'Administração': ShieldCheck,
  'Futuras Integrações': Rocket,
}

const STATUS_CONFIG: Record<RoadmapFeature['status'], { label: string; dot: string; badge: string }> = {
  disponivel: { label: 'Disponível', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  em_desenvolvimento: { label: 'Em desenvolvimento', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  em_testes: { label: 'Em testes', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
  planejado: { label: 'Planejado', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
}

function FeatureCard({ feature }: { feature: RoadmapFeature }) {
  const status = STATUS_CONFIG[feature.status]
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-text-main font-bold text-[15px] leading-snug">{feature.name}</h3>
        <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${status.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>

      <div className="mt-1 space-y-2.5 pt-3 border-t border-border">
        <div className="flex items-start gap-2">
          <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Benefícios</p>
            <p className="text-xs text-text-main leading-relaxed">{feature.benefits}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Wrench size={14} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Como usar</p>
            <p className="text-xs text-text-main leading-relaxed">{feature.how_to_use}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Lightbulb size={14} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Problema que resolve</p>
            <p className="text-xs text-text-main leading-relaxed">{feature.problem_solved}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RoadmapView() {
  const [features, setFeatures] = useState<RoadmapFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Todas')

  useEffect(() => {
    fetch('/api/roadmap')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar.')
        setFeatures(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const seen: string[] = []
    for (const f of features) {
      if (!seen.includes(f.category)) seen.push(f.category)
    }
    return seen
  }, [features])

  const counts = useMemo(() => {
    const total = features.length
    const disponivel = features.filter((f) => f.status === 'disponivel').length
    return { total, disponivel }
  }, [features])

  const filtered = activeCategory === 'Todas' ? features : features.filter((f) => f.category === activeCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
        <AlertCircle size={16} /> {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={22} className="text-primary" />
          <h1 className="text-text-main text-2xl font-bold">Próximas Atualizações</h1>
        </div>
        <p className="text-text-muted text-sm max-w-2xl">
          Este é o roadmap oficial da Digital Alpha: tudo que está planejado, em desenvolvimento, em testes ou já disponível na plataforma.
          A ideia é você acompanhar de perto a evolução do sistema.
        </p>
        <p className="text-text-muted text-xs mt-3">
          {counts.disponivel} de {counts.total} funcionalidades já disponíveis nesta lista.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('Todas')}
          className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${activeCategory === 'Todas' ? 'bg-primary text-white border-primary' : 'bg-surface text-text-muted border-border hover:border-primary/40'}`}
        >
          Todas
        </button>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Sparkles
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${activeCategory === cat ? 'bg-primary text-white border-primary' : 'bg-surface text-text-muted border-border hover:border-primary/40'}`}
            >
              <Icon size={14} /> {cat}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </div>
  )
}
