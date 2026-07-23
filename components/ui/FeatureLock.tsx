'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { Lock, X, Sparkles } from 'lucide-react'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'

interface FeatureLockProps {
  featureKey: string
  children: ReactNode
  className?: string
  // 'overlay' (padrão): mostra o conteúdo real desfocado atrás do cadeado —
  // usado quando o conteúdo já é ok de "espiar" (uma tela inteira, um card).
  // 'replace': troca o conteúdo inteiro por um bloco de cadeado simples —
  // usado em botões/ações pequenas, onde não faz sentido desfocar o próprio botão.
  variant?: 'overlay' | 'replace'
}

// Trava qualquer funcionalidade por plano: se plans.features[featureKey] for
// false, mostra um cadeado em vez do conteúdo (sem escondê-lo por completo) e
// abre um aviso de upgrade ao clicar — nunca bloqueia silenciosamente.
export function FeatureLock({ featureKey, children, className = '', variant = 'overlay' }: FeatureLockProps) {
  const { isLocked, planName, loading } = usePlanFeatures()
  const [showModal, setShowModal] = useState(false)

  if (loading || !isLocked(featureKey)) {
    return <>{children}</>
  }

  return (
    <div className={`relative ${className}`}>
      {variant === 'overlay' ? (
        <>
          <div className="pointer-events-none opacity-40 blur-[1.5px] select-none">{children}</div>
          <button
            onClick={() => setShowModal(true)}
            className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/40 hover:bg-surface/60 transition-colors rounded-xl"
          >
            <span className="flex items-center gap-1.5 bg-surface border border-border shadow-md px-3 py-1.5 rounded-full text-xs font-semibold text-text-main">
              <Lock size={13} /> Fazer upgrade
            </span>
          </button>
        </>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-text-disabled text-sm cursor-pointer hover:border-primary/30 hover:text-text-muted transition-colors"
        >
          <Lock size={14} /> Bloqueado
        </button>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={20} />
                  <h2 className="text-lg font-bold text-text-main">Disponível em outro plano</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-hover-bg rounded-lg text-text-muted"><X size={18} /></button>
              </div>
              <p className="text-sm text-text-muted mb-5">
                Essa funcionalidade não está incluída no seu plano atual{planName ? ` (${planName})` : ''}. Faça upgrade pra desbloquear.
              </p>
              <Link
                href="/assinatura"
                className="w-full flex items-center justify-center py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium"
              >
                Ver planos e fazer upgrade
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
