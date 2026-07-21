'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, QrCode, PartyPopper, Rocket } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface PaymentDueSoon {
  days: number
  date: string
  paymentMethod: 'card' | 'pix'
  isTrial: boolean
}

interface ClientLimitClose {
  used: number
  limit: number
}

type AlertKind = 'payment' | 'upgrade'

function seenKey(kind: AlertKind) {
  const today = new Date().toISOString().slice(0, 10)
  return `billing-alert-seen:${kind}:${today}`
}

// Popups de cobrança que aparecem pra quem loga na empresa (admin, gestor ou
// colaborador) — não confundir com o painel gerencial em
// /superadmin/pagamentos, que é uma visão de todas as empresas pro dono da
// plataforma. Aqui é o aviso individual, um por dia, pra cada empresa.
export function BillingAlertsModal() {
  const router = useRouter()
  const { role } = useAuth()
  const podeAgir = role === 'admin' || role === 'manager'

  const [queue, setQueue] = useState<AlertKind[]>([])
  const [payment, setPayment] = useState<PaymentDueSoon | null>(null)
  const [limitClose, setLimitClose] = useState<ClientLimitClose | null>(null)

  useEffect(() => {
    fetch('/api/billing-alerts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const pending: AlertKind[] = []
        if (data.paymentDueSoon && !localStorage.getItem(seenKey('payment'))) {
          setPayment(data.paymentDueSoon)
          pending.push('payment')
        }
        if (data.clientLimitClose && !localStorage.getItem(seenKey('upgrade'))) {
          setLimitClose(data.clientLimitClose)
          pending.push('upgrade')
        }
        setQueue(pending)
      })
      .catch(() => {})
  }, [])

  const dismiss = () => {
    setQueue((prev) => {
      const [current, ...rest] = prev
      if (current) localStorage.setItem(seenKey(current), '1')
      return rest
    })
  }

  const goToAssinatura = () => {
    dismiss()
    router.push('/assinatura')
  }

  if (queue.length === 0) return null
  const current = queue[0]

  if (current === 'payment' && payment) {
    const isPix = payment.paymentMethod === 'pix'
    const dataFmt = new Date(payment.date).toLocaleDateString('pt-BR')

    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" />
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
            <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:bg-hover-bg transition-colors">
              <X size={18} />
            </button>

            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isPix ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary'}`}>
              {isPix ? <QrCode size={22} /> : <Clock size={22} />}
            </div>

            <h2 className="text-text-main text-lg font-bold mb-2">
              {isPix
                ? payment.days === 0 ? 'Seu acesso vence hoje' : `Faltam ${payment.days} dia${payment.days === 1 ? '' : 's'} pro seu Pix vencer`
                : payment.isTrial
                  ? `Seu período de teste termina em ${payment.days} dia${payment.days === 1 ? '' : 's'}`
                  : `Sua próxima cobrança é em ${payment.days} dia${payment.days === 1 ? '' : 's'}`}
            </h2>

            <p className="text-sm text-text-muted leading-relaxed mb-5">
              {isPix && podeAgir && (
                <>Pra continuar usando a Alpha sem interrupção, é só renovar o pagamento até <strong className="text-text-main">{dataFmt}</strong>. Leva menos de um minuto e garante que sua equipe e seus clientes não fiquem sem acesso.</>
              )}
              {isPix && !podeAgir && (
                <>O acesso da sua empresa na Alpha vence em <strong className="text-text-main">{dataFmt}</strong>. Avise o administrador da sua conta pra renovar o pagamento e ninguém ficar sem acesso.</>
              )}
              {!isPix && payment.isTrial && (
                <>A partir de <strong className="text-text-main">{dataFmt}</strong>, o cartão cadastrado será cobrado automaticamente e o plano continua ativo sem precisar fazer nada. {podeAgir ? 'Se quiser revisar seus dados antes disso, dá uma olhada na sua assinatura.' : ''}</>
              )}
              {!isPix && !payment.isTrial && (
                <>A assinatura da sua empresa renova automaticamente em <strong className="text-text-main">{dataFmt}</strong>. {podeAgir ? 'Não precisa fazer nada, só garanta que o cartão cadastrado continua válido.' : 'Nada pra você fazer aqui, é só um aviso.'}</>
              )}
            </p>

            <div className="flex gap-3">
              <button onClick={dismiss} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">
                {podeAgir && isPix ? 'Depois' : 'Entendi'}
              </button>
              {podeAgir && (
                <button onClick={goToAssinatura} className="flex-1 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium">
                  {isPix ? 'Renovar agora' : 'Ver assinatura'}
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (current === 'upgrade' && limitClose) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" />
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
            <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:bg-hover-bg transition-colors">
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-cta/10 text-cta">
              <PartyPopper size={22} />
            </div>

            <h2 className="text-text-main text-lg font-bold mb-2">Parabéns, sua agência está crescendo!</h2>

            <p className="text-sm text-text-muted leading-relaxed mb-5">
              Vocês já têm <strong className="text-text-main">{limitClose.used} de {limitClose.limit}</strong> clientes cadastrados no plano atual, ou seja, só sobra espaço pra mais 1. É um ótimo sinal, a operação está evoluindo de verdade.{' '}
              {podeAgir
                ? 'Pra continuar cadastrando clientes sem parar pra pensar em limite, dá uma olhada em fazer upgrade do plano. Sua agência merece esse próximo passo.'
                : 'Vale comentar com o administrador da conta sobre fazer upgrade do plano, pra vocês continuarem crescendo sem esbarrar no limite.'}
            </p>

            <div className="flex gap-3">
              <button onClick={dismiss} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">
                Depois
              </button>
              {podeAgir && (
                <button onClick={goToAssinatura} className="flex-1 px-4 py-2.5 rounded-lg bg-cta hover:bg-cta-hover text-white transition-colors text-sm font-medium flex items-center justify-center gap-1.5">
                  <Rocket size={14} /> Ver upgrade
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}
