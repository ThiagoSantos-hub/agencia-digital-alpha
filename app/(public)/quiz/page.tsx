'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'

type PlanId = 'gratuito' | 'pro' | 'premium'

interface Option {
  label: string
  scores: Partial<Record<PlanId, number>>
}

interface Question {
  question: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    question: 'Quantos clientes você gerencia hoje?',
    options: [
      { label: 'Até 10', scores: { gratuito: 1 } },
      { label: '11 a 30', scores: { pro: 1 } },
      { label: 'Mais de 30', scores: { premium: 1 } },
    ],
  },
  {
    question: 'Você já envia relatórios pros seus clientes automaticamente?',
    options: [
      { label: 'Não, faço tudo manual', scores: { gratuito: 1 } },
      { label: 'Às vezes, de vez em quando', scores: { pro: 1 } },
      { label: 'Sim, e quero automatizar ainda mais', scores: { premium: 1 } },
    ],
  },
  {
    question: 'Você tem colaboradores trabalhando com você?',
    options: [
      { label: 'Só eu, por enquanto', scores: { gratuito: 1 } },
      { label: 'Tenho uma equipe pequena', scores: { pro: 1 } },
      { label: 'Tenho uma equipe grande', scores: { premium: 1 } },
    ],
  },
  {
    question: 'O que mais te interessa agora?',
    options: [
      { label: 'Só testar sem compromisso', scores: { gratuito: 2 } },
      { label: 'Crescer com mais automação', scores: { pro: 2 } },
      { label: 'Ter tudo sem limite nenhum', scores: { premium: 2 } },
    ],
  },
]

const PLAN_ORDER: PlanId[] = ['gratuito', 'pro', 'premium']
const PLAN_LABELS: Record<PlanId, string> = { gratuito: 'Gratuito', pro: 'Pro', premium: 'Max' }

export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState<Record<PlanId, number>>({ gratuito: 0, pro: 0, premium: 0 })
  const [result, setResult] = useState<PlanId | null>(null)

  const answer = (option: Option) => {
    const newScores = { ...scores }
    for (const [planId, value] of Object.entries(option.scores)) {
      newScores[planId as PlanId] += value ?? 0
    }
    setScores(newScores)

    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      const best = PLAN_ORDER.reduce((a, b) => (newScores[b] > newScores[a] ? b : a))
      setResult(best)
    }
  }

  if (result) {
    return (
      <div className="h-screen bg-background px-4 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-sm text-center">
          <Sparkles size={28} className="text-primary mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-1">Baseado nas suas respostas, o plano ideal pra você é</p>
          <h1 className="text-2xl font-bold text-text-main mb-6">{PLAN_LABELS[result]}</h1>
          <button
            onClick={() => router.push(`/assinar?plan=${result}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors"
          >
            Ver esse plano <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  const current = QUESTIONS[step]

  return (
    <div className="h-screen bg-background px-4 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-1.5 mb-4">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <p className="text-xs text-text-muted mb-1">Pergunta {step + 1} de {QUESTIONS.length}</p>
        <h1 className="text-lg font-bold text-text-main mb-5">{current.question}</h1>

        <div className="space-y-2.5">
          {current.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => answer(opt)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-surface text-text-main text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
