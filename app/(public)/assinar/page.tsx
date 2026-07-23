'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CreditCard, QrCode } from 'lucide-react'
import { maskPhone } from '@/lib/validators'

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
}

function planDesc(p: PublicPlan): string {
  const partes: string[] = []
  partes.push(p.client_limit === null ? 'clientes ilimitados' : `até ${p.client_limit} clientes`)
  if (p.monthly_reports_limit !== null) partes.push(`${p.monthly_reports_limit} relatórios/mês`)
  if (p.monthly_alerts_limit !== null) partes.push(`${p.monthly_alerts_limit} alertas/mês`)
  return partes.join(' · ')
}

export default function AssinarPage() {
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
    fetch('/api/public/plans')
      .then((res) => res.json())
      .then((data: PublicPlan[]) => {
        setPlans(data)
        if (data.length > 0) setPlan(data[0].id)
      })
      .finally(() => setLoadingPlans(false))
  }, [])

  const selectedPlan = plans.find((p) => p.id === plan) ?? null
  const isFree = !!selectedPlan?.is_free

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
          <h1 className="text-xl font-bold text-text-main mb-1">Assine a Digital Alpha</h1>
          <p className="text-sm text-text-muted mb-6">Preencha seus dados e escolha o plano pra começar.</p>

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

            <div>
              <label className={labelCls}>Escolha seu plano</label>
              {loadingPlans ? (
                <p className="text-sm text-text-muted">Carregando planos...</p>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)` }}>
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border text-center transition-colors ${
                        plan === p.id ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted hover:border-primary/40'
                      }`}
                    >
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className="text-xs">{p.is_free ? 'Grátis' : `R$ ${p.price_brl.toFixed(2).replace('.', ',')}/mês`}</span>
                      <span className="text-[10px] text-text-muted px-2 text-center">{planDesc(p)}</span>
                    </button>
                  ))}
                </div>
              )}
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
              disabled={loading || loadingPlans}
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
