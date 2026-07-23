'use client'

import { useEffect, useState } from 'react'
import { Loader2, CreditCard, QrCode, CheckCircle2, Facebook } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface PlanDetails {
  name: string
  client_limit: number | null
  monthly_reports_limit: number | null
  monthly_alerts_limit: number | null
  is_free: boolean
}

interface CompanyBilling {
  name: string
  plan: string | null
  plan_details: PlanDetails | null
  payment_method: 'card' | 'pix' | null
  subscription_status: string | null
  access_expires_at: string | null
  renews_at: string | null
  meta_tester_profile: string | null
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Em período de teste',
  active: 'Ativa',
  past_due: 'Pagamento atrasado',
  unpaid: 'Pagamento não realizado',
  canceled: 'Cancelada',
  pix_ativo: 'Ativa (Pix)',
  pix_expirado: 'Expirada (Pix)',
}

function limiteTexto(planDetails: PlanDetails | null): string {
  if (!planDetails) return ''
  return planDetails.client_limit === null ? 'clientes ilimitados' : `até ${planDetails.client_limit} clientes`
}

export default function AssinaturaPage() {
  const { profile } = useAuth()
  const [company, setCompany] = useState<CompanyBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [facebookProfile, setFacebookProfile] = useState('')
  const [savingFacebook, setSavingFacebook] = useState(false)
  const [facebookError, setFacebookError] = useState<string | null>(null)
  const [facebookSaved, setFacebookSaved] = useState(false)

  useEffect(() => {
    fetch('/api/company')
      .then((res) => res.json())
      .then((data) => {
        setCompany(data)
        setFacebookProfile(data.meta_tester_profile ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveFacebook = async () => {
    setSavingFacebook(true)
    setFacebookError(null)
    setFacebookSaved(false)
    const res = await fetch('/api/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta_tester_profile: facebookProfile }),
    })
    setSavingFacebook(false)
    if (!res.ok) {
      const data = await res.json()
      setFacebookError(data.error || 'Erro ao salvar.')
      return
    }
    setFacebookSaved(true)
  }

  const handleRenew = async () => {
    setRenewing(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/renew-pix', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar cobrança.')
        setRenewing(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Erro ao gerar cobrança.')
      setRenewing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Assinatura</h1>
        <p className="text-sm text-text-muted mt-1">Status do seu plano na plataforma.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          {company?.payment_method === 'pix' ? <QrCode size={20} className="text-primary" /> : <CreditCard size={20} className="text-primary" />}
          <div>
            <p className="text-sm font-medium text-text-main">
              {company?.plan_details?.name ?? 'Sem plano configurado'}
            </p>
            <p className="text-xs text-text-muted">
              {limiteTexto(company?.plan_details ?? null)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {company?.subscription_status ? (STATUS_LABELS[company.subscription_status] ?? company.subscription_status) : '-'}
            </p>
          </div>
        </div>

        {company?.payment_method === 'card' && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-text-muted">
              Próxima cobrança em{' '}
              <span className="text-text-main font-medium">
                {company.renews_at ? new Date(company.renews_at).toLocaleDateString('pt-BR') : '-'}
              </span>
            </p>
            <p className="text-xs text-text-muted mt-2">
              Sua assinatura é renovada automaticamente todo mês nessa data. Se precisar cancelar ou trocar o cartão, entre em contato com o suporte.
            </p>
          </div>
        )}

        {company?.payment_method === 'pix' && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-sm text-text-muted">
                Acesso válido até{' '}
                <span className="text-text-main font-medium">
                  {company.access_expires_at ? new Date(company.access_expires_at).toLocaleDateString('pt-BR') : '-'}
                </span>
              </p>
              <p className="text-xs text-text-muted mt-2">
                O pagamento por Pix não renova sozinho. Pra continuar usando depois dessa data, clica no botão abaixo e paga de novo.
              </p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{error}</div>}

            <button
              onClick={handleRenew}
              disabled={renewing}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {renewing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {renewing ? 'Gerando cobrança...' : 'Renovar agora (mais 30 dias)'}
            </button>
          </>
        )}
      </div>

      {profile?.role === 'admin' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Facebook size={20} className="text-primary" />
            <div>
              <p className="text-sm font-medium text-text-main">Perfil do Facebook cadastrado</p>
              <p className="text-xs text-text-muted">Usado só pra identificação da sua conta na plataforma.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-xl text-text-main text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              value={facebookProfile}
              onChange={(e) => { setFacebookProfile(e.target.value); setFacebookSaved(false) }}
              placeholder="facebook.com/seuperfil"
            />
            <button
              onClick={handleSaveFacebook}
              disabled={savingFacebook || !facebookProfile.trim()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              {savingFacebook ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {facebookError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm">{facebookError}</div>}
          {facebookSaved && <p className="text-cta text-xs">Perfil atualizado.</p>}
        </div>
      )}
    </div>
  )
}
