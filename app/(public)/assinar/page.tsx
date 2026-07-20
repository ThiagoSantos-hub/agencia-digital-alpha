'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CreditCard, QrCode } from 'lucide-react'
import { maskPhone } from '@/lib/validators'

const inputCls = 'w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
const labelCls = 'block text-sm font-medium text-text-main mb-1.5'

const PLANOS = [
  { value: 'basico', label: 'Básico', price: 'R$ 47/mês', desc: 'até 5 clientes' },
  { value: 'pro', label: 'Pro', price: 'R$ 97/mês', desc: 'até 15 clientes' },
  { value: 'premium', label: 'Premium', price: 'R$ 147/mês', desc: 'clientes ilimitados' },
] as const

export default function AssinarPage() {
  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    phone: '',
    facebookProfile: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card')
  const [plan, setPlan] = useState<'basico' | 'pro' | 'premium'>('basico')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      window.location.href = data.url
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
          <p className="text-sm text-text-muted mb-6">Preencha seus dados e escolha a forma de pagamento pra começar.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nome da empresa *</label>
              <input className={inputCls} value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} placeholder="Agência XYZ" />
            </div>
            <div>
              <label className={labelCls}>Seu nome *</label>
              <input className={inputCls} value={form.adminName} onChange={(e) => setField('adminName', e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className={labelCls}>Seu e-mail *</label>
              <input type="email" className={inputCls} value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} placeholder="voce@empresa.com" />
            </div>
            <div>
              <label className={labelCls}>Telefone/WhatsApp *</label>
              <input className={inputCls} value={form.phone} onChange={(e) => setField('phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className={labelCls}>Perfil do Facebook *</label>
              <input className={inputCls} value={form.facebookProfile} onChange={(e) => setField('facebookProfile', e.target.value)} placeholder="facebook.com/seuperfil" />
              <p className="text-xs text-text-muted mt-1">Precisamos disso pra liberar seu acesso ao Meta Ads/Instagram depois.</p>
            </div>

            <div>
              <label className={labelCls}>Escolha seu plano</label>
              <div className="grid grid-cols-3 gap-3">
                {PLANOS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border text-center transition-colors ${
                      plan === p.value ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text-muted hover:border-primary/40'
                    }`}
                  >
                    <span className="text-sm font-semibold">{p.label}</span>
                    <span className="text-xs">{p.price}</span>
                    <span className="text-[10px] text-text-muted">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

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
              {loading ? 'Processando...' : 'Continuar para pagamento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
