'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader } from '@/components/ui/Card'
import { Loader2, CreditCard, TrendingUp, Clock, AlertTriangle, Timer, Calendar } from 'lucide-react'
import { PLAN_LABELS, type Plan } from '@/lib/planLimits'

interface CompanyPayment {
  id: string
  name: string
  slug: string
  is_platform_owner: boolean
  active: boolean
  plan: Plan | null
  payment_method: 'card' | 'pix' | null
  subscription_status: string | null
  access_expires_at: string | null
  admin_emails: string[]
  renews_at: string | null
}

interface Summary {
  mrr: number
  total: number
  emDia: number
  emTrial: number
  atrasados: number
  pixVencendo: number
}

const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '-')

function statusInfo(c: CompanyPayment): { label: string; cls: string } {
  if (c.payment_method === 'card') {
    if (c.subscription_status === 'trialing') return { label: 'Em teste', cls: 'text-primary bg-primary/10 border-primary/30' }
    if (c.subscription_status === 'active') return { label: 'Em dia', cls: 'text-cta bg-cta/10 border-cta/30' }
    if (c.subscription_status === 'past_due') return { label: 'Atrasado', cls: 'text-amber-600 bg-amber-50 border-amber-200' }
    if (['unpaid', 'canceled', 'incomplete_expired'].includes(c.subscription_status ?? '')) {
      return { label: 'Cancelado', cls: 'text-red-600 bg-red-50 border-red-200' }
    }
    return { label: c.subscription_status ?? '-', cls: 'text-text-muted bg-slate-100 border-slate-200' }
  }
  if (c.payment_method === 'pix') {
    if (c.subscription_status === 'pix_expirado') return { label: 'Vencido', cls: 'text-red-600 bg-red-50 border-red-200' }
    if (c.subscription_status === 'pix_ativo') {
      const venceLogo = c.access_expires_at && new Date(c.access_expires_at).getTime() <= Date.now() + 5 * 24 * 60 * 60 * 1000
      return venceLogo
        ? { label: 'Vencendo em breve', cls: 'text-amber-600 bg-amber-50 border-amber-200' }
        : { label: 'Em dia', cls: 'text-cta bg-cta/10 border-cta/30' }
    }
    return { label: c.subscription_status ?? '-', cls: 'text-text-muted bg-slate-100 border-slate-200' }
  }
  return { label: '-', cls: 'text-text-muted bg-slate-100 border-slate-200' }
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string | string[]; value: string; tone: string }) {
  const linhas = Array.isArray(label) ? label : [label]
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-text-muted text-[11px] font-medium uppercase tracking-wide leading-tight">
          {linhas.map((linha, i) => <span key={i} className="block">{linha}</span>)}
        </p>
        <p className="text-text-main text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}

const hoje = () => new Date().toISOString().slice(0, 10)

export default function SuperAdminPagamentosPage() {
  const { profile, loading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyPayment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [apenasProblemas, setApenasProblemas] = useState(false)
  const [mrrAte, setMrrAte] = useState(hoje())

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true)
      const res = await fetch(`/api/superadmin/payments?until=${mrrAte}`)
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies)
        setSummary(data.summary)
      }
      setLoading(false)
    }
    fetchPayments()
  }, [mrrAte])

  if (authLoading) return null
  if (!profile?.is_super_admin) {
    return <p className="text-text-muted text-sm">Acesso restrito.</p>
  }

  const visiveis = apenasProblemas
    ? companies.filter((c) => {
        const s = statusInfo(c)
        return s.label === 'Atrasado' || s.label === 'Cancelado' || s.label === 'Vencido' || s.label === 'Vencendo em breve' || !c.active
      })
    : companies

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Pagamentos</h1>
        <p className="text-text-muted text-sm mt-1">Acompanhe como está o pagamento de cada empresa cliente.</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <Calendar size={16} className="text-primary shrink-0" />
        <label className="text-sm text-text-main font-medium shrink-0" htmlFor="mrr-ate">
          Calcular o MRR estimado considerando empresas cadastradas até:
        </label>
        <input
          id="mrr-ate"
          type="date"
          value={mrrAte}
          onChange={(e) => setMrrAte(e.target.value || hoje())}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary/50 cursor-pointer"
        />
        {mrrAte !== hoje() && (
          <button onClick={() => setMrrAte(hoje())} className="text-xs text-primary hover:underline shrink-0">
            Voltar pra hoje
          </button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-text-muted text-[11px] font-medium uppercase tracking-wide leading-tight">MRR estimado</p>
              <p className="text-text-main text-lg font-bold leading-tight">{formatBRL(summary.mrr)}</p>
            </div>
          </div>
          <SummaryCard icon={<CreditCard size={18} />} label="Em dia" value={String(summary.emDia)} tone="bg-cta/10 text-cta" />
          <SummaryCard icon={<Clock size={18} />} label="Em teste" value={String(summary.emTrial)} tone="bg-primary/10 text-primary" />
          <SummaryCard icon={<AlertTriangle size={18} />} label={['Atrasadas', 'canceladas']} value={String(summary.atrasados)} tone="bg-red-50 text-red-600" />
          <SummaryCard icon={<Timer size={18} />} label="Pix vencendo (5d)" value={String(summary.pixVencendo)} tone="bg-amber-50 text-amber-600" />
        </div>
      )}

      <Card padding="sm" animate={false}>
        <div className="flex items-center justify-between px-1">
          <CardHeader title="Empresas com cobrança" description={`${visiveis.length} de ${companies.length} empresa(s)`} />
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer mb-3 shrink-0">
            <input type="checkbox" checked={apenasProblemas} onChange={(e) => setApenasProblemas(e.target.checked)} />
            Mostrar só quem precisa de atenção
          </label>
        </div>

        {loading ? (
          <p className="text-text-muted text-sm p-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando...</p>
        ) : visiveis.length === 0 ? (
          <p className="text-text-muted text-sm p-3">{apenasProblemas ? 'Nenhuma empresa com pendência no momento.' : 'Nenhuma empresa com cobrança via Stripe ainda.'}</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Empresa</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Plano</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Pagamento</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Status</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">{'Renovação / Vencimento'}</th>
                  <th className="text-left font-semibold text-text-muted text-xs uppercase tracking-wide py-2.5 px-3">Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiveis.map((c) => {
                  const s = statusInfo(c)
                  const dataRef = c.payment_method === 'card' ? c.renews_at : c.access_expires_at
                  return (
                    <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                      <td className="py-3 px-3 align-top">
                        <p className="text-text-main font-medium">{c.name}</p>
                        <p className="text-text-muted text-xs mt-0.5">{c.admin_emails[0] || '-'}</p>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className="text-text-main">{c.plan ? PLAN_LABELS[c.plan] : '-'}</span>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className="text-text-main">{c.payment_method === 'pix' ? 'Pix' : 'Cartão'}</span>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="py-3 px-3 align-top text-text-main">{formatDate(dataRef)}</td>
                      <td className="py-3 px-3 align-top">
                        <span className={`text-xs px-2 py-1 rounded-lg border whitespace-nowrap ${c.active ? 'text-cta bg-cta/10 border-cta/30' : 'text-text-disabled bg-slate-100 border-slate-200'}`}>
                          {c.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
