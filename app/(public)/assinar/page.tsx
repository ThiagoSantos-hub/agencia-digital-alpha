'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CreditCard, QrCode, Check, X as XIcon, ChevronLeft, Sparkles } from 'lucide-react'
import { maskPhone } from '@/lib/validators'
import { FEATURES } from '@/lib/features'

const inputCls = 'w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
const labelCls = 'block text-sm font-medium text-text-main mb-1.5'

function RequiredLabel({ text, filled }: { text: string; filled: boolean }) {
  return (
    <label className={labelCls}>
      {text} <span className={filled ? 'text-emerald-500' : 'text-red-500'}>*</span>
    </label>
  )
}

interface PublicPlan {
  id: string
  name: string
  price_brl: number
  client_limit: number | null
  monthly_reports_limit: number | null
  monthly_alerts_limit: number | null
  is_free: boolean
  display_order: number
  features: Record<string, boolean>
  description: string | null
}

function isIncluded(plan: PublicPlan, key: string): boolean {
  return plan.features?.[key] !== false
}

// Na tela pública só mostra o módulo inteiro (não cada trava granular de
// dentro dele) — só aparece riscado se o módulo E todas as travas internas
// dele estiverem bloqueadas. Se sobrar qualquer coisa liberada lá dentro, o
// módulo continua aparecendo como disponível.
const MODULOS = FEATURES.filter((f) => f.group === 'Módulos')

function isModuleAvailable(plan: PublicPlan, moduloKey: string, moduloLabel: string): boolean {
  if (isIncluded(plan, moduloKey)) return true
  const grupoInterno = moduloLabel.replace('Módulo ', '')
  const itensInternos = FEATURES.filter((f) => f.group === grupoInterno)
  return itensInternos.some((f) => isIncluded(plan, f.key))
}

function limitsList(p: PublicPlan): string[] {
  return [
    p.client_limit === null ? 'Clientes ilimitados' : `Até ${p.client_limit} clientes`,
    p.monthly_reports_limit === null ? 'Relatórios ilimitados' : `${p.monthly_reports_limit} relatórios/mês`,
    p.monthly_alerts_limit === null ? 'Alertas ilimitados' : `${p.monthly_alerts_limit} alertas/mês`,
  ]
}

// Card por plano (visual original) — bem mais compacto que a primeira versão
// (fontes e espaçamentos menores) pra caber numa tela só, sem rolagem.
function PlanCard({ plan, onChoose, highlight, recommended }: { plan: PublicPlan; onChoose: () => void; highlight: boolean; recommended: boolean }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-3 transition-colors ${
        recommended ? 'border-cta bg-cta/5 shadow-md ring-1 ring-cta/30' : highlight ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-surface'
      }`}
    >
      {recommended ? (
        <span className="self-start mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-cta text-white px-1.5 py-0.5 rounded-full">
          <Sparkles size={9} /> Recomendado pra você
        </span>
      ) : highlight ? (
        <span className="self-start mb-1 text-[9px] font-bold uppercase tracking-wide bg-primary text-white px-1.5 py-0.5 rounded-full">
          Mais completo
        </span>
      ) : (
        <span className="mb-1 h-[15px]" />
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-text-main">{plan.name}</h3>
        <p className="text-sm font-extrabold text-text-main whitespace-nowrap">
          {plan.is_free ? 'Grátis' : `R$ ${plan.price_brl.toFixed(2).replace('.', ',')}`}
          {!plan.is_free && <span className="text-[10px] font-medium text-text-muted">/mês</span>}
        </p>
      </div>

      {plan.description && (
        <p className="mt-2 mb-2 text-[10.5px] leading-snug text-text-muted whitespace-pre-line">{plan.description}</p>
      )}

      <ul className="mt-2 space-y-0.5">
        {limitsList(plan).map((l) => (
          <li key={l} className="flex items-center gap-1.5 text-[11px] leading-tight text-text-main">
            <Check size={11} className="text-cta shrink-0" /> {l}
          </li>
        ))}
      </ul>

      <ul className="mt-1.5 pt-1.5 border-t border-border space-y-0.5">
        {MODULOS.map((m) => {
          const available = isModuleAvailable(plan, m.key, m.label)
          return (
            <li
              key={m.key}
              className={`flex items-center gap-1.5 text-[11px] leading-tight ${available ? 'text-text-main' : 'text-text-disabled line-through'}`}
            >
              {available ? <Check size={11} className="text-cta shrink-0" /> : <XIcon size={11} className="shrink-0" />}
              {m.label}
            </li>
          )
        })}
      </ul>

      <button
        onClick={onChoose}
        className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          recommended
            ? 'bg-cta hover:bg-cta-hover text-white'
            : highlight
              ? 'bg-primary hover:bg-primary-hover text-white'
              : 'bg-background border border-border text-text-main hover:border-primary/40'
        }`}
      >
        Escolher {plan.name}
      </button>
    </div>
  )
}

export default function AssinarPage() {
  return (
    <Suspense fallback={null}>
      <AssinarForm />
    </Suspense>
  )
}

function AssinarForm() {
  const searchParams = useSearchParams()
  const planFromQuiz = searchParams.get('plan')

  const [step, setStep] = useState<'plan' | 'form'>('plan')
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [plan, setPlan] = useState<string>('')

  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    phone: '',
    facebookProfile: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/public/plans', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: PublicPlan[]) => setPlans(data))
      .finally(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find((p) => p.id === plan) ?? null
  const isFree = !!selectedPlan?.is_free
  const highestPrice = Math.max(0, ...plans.map((p) => p.price_brl))

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const choosePlan = (id: string) => {
    setPlan(id)
    setStep('form')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.companyName || !form.adminName || !form.adminEmail || !form.phone || !form.facebookProfile) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paymentMethod, plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao processar o cadastro.')
        setLoading(false)
        return
      }
      window.location.href = data.redirect || data.url
    } catch {
      setError('Erro ao processar o cadastro. Tente novamente.')
      setLoading(false)
    }
  }

  if (step === 'plan') {
    return (
      <div className="min-h-screen md:h-screen bg-background px-4 py-8 md:py-4 flex flex-col items-center justify-center overflow-y-auto md:overflow-hidden">
        {loadingPlans ? (
          <Loader2 className="animate-spin text-primary" size={32} />
        ) : (
          <>
            <h1 className="text-lg font-bold text-text-main mb-4">Escolha seu plano</h1>
            <div className="max-w-5xl w-full grid gap-3 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  onChoose={() => choosePlan(p.id)}
                  highlight={!p.is_free && p.price_brl === highestPrice}
                  recommended={p.id === planFromQuiz}
                />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
          <button
            onClick={() => setStep('plan')}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-primary mb-4 transition-colors"
          >
            <ChevronLeft size={14} /> Trocar plano
          </button>

          <h1 className="text-xl font-bold text-text-main mb-1">Assine a Digital Alpha</h1>
          {plan === planFromQuiz && (
            <p className="flex items-center gap-1.5 text-xs text-cta font-medium mb-2">
              <Sparkles size={13} /> Recomendado com base nas suas respostas
            </p>
          )}
          <p className="text-sm text-text-muted mb-6">
            Plano escolhido: <strong className="text-text-main">{selectedPlan?.name}</strong>
            {selectedPlan && !selectedPlan.is_free && `, R$ ${selectedPlan.price_brl.toFixed(2).replace('.', ',')}/mês`}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <RequiredLabel text="Nome da empresa" filled={!!form.companyName.trim()} />
              <input className={inputCls} value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} placeholder="Agência XYZ" />
            </div>
            <div>
              <RequiredLabel text="Seu nome" filled={!!form.adminName.trim()} />
              <input className={inputCls} value={form.adminName} onChange={(e) => setField('adminName', e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <RequiredLabel text="Seu e-mail" filled={!!form.adminEmail.trim()} />
              <input type="email" className={inputCls} value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} placeholder="voce@empresa.com" />
            </div>
            <div>
              <RequiredLabel text="Telefone/WhatsApp" filled={!!form.phone.trim()} />
              <input className={inputCls} value={form.phone} onChange={(e) => setField('phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <RequiredLabel text="Perfil do Facebook" filled={!!form.facebookProfile.trim()} />
              <input className={inputCls} value={form.facebookProfile} onChange={(e) => setField('facebookProfile', e.target.value)} placeholder="facebook.com/seuperfil" />
              <p className="text-xs text-text-muted mt-1">
                {isFree
                  ? 'Usamos isso pra identificar seu cadastro e evitar que o plano Gratuito seja renovado com e-mails diferentes.'
                  : 'Precisamos disso pra liberar seu acesso ao Meta Ads/Instagram depois.'}
              </p>
            </div>

            {!isFree && (
              <div>
                <label className={labelCls}>Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      paymentMethod === 'card' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    <CreditCard size={16} /> Cartão
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      paymentMethod === 'pix' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    <QrCode size={16} /> Pix
                  </button>
                </div>
                {paymentMethod === 'card' ? (
                  <p className="text-xs text-text-muted mt-2">Assinatura mensal recorrente. Se você nunca usou o sistema antes, ganha um período de teste grátis antes da primeira cobrança.</p>
                ) : (
                  <p className="text-xs text-text-muted mt-2">Pagamento único via Pix (com acréscimo de 10% sobre o valor do cartão), libera 30 dias de acesso. Sem teste grátis: pra continuar usando depois, é só pagar de novo dentro do sistema.</p>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-red-600 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Processando...' : isFree ? 'Criar minha conta grátis' : 'Continuar para pagamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
