'use client'

import { useEffect, useState } from 'react'
import { Users, Send, Loader2 } from 'lucide-react'

interface SquadMemberInfo {
  id: string
  name: string
  emoji: string
  group: 'chief' | 'platform' | 'functional'
}

interface SquadAnswer {
  specialist: { id: string; name: string; emoji: string }
  content: string
  autoRouted: boolean
}

export function TrafficSquad({ clientId }: { clientId: string }) {
  const [members, setMembers] = useState<SquadMemberInfo[]>([])
  const [specialistId, setSpecialistId] = useState<string>('auto')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<SquadAnswer | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/squad`)
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {})
  }, [clientId])

  const plataforma = members.filter((m) => m.group === 'platform')
  const funcional = members.filter((m) => m.group === 'functional')

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/squad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          specialistId: specialistId === 'auto' ? undefined : specialistId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao consultar o Squad.')
        return
      }
      setAnswer(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-text-main font-semibold text-sm mb-3 flex items-center gap-2">
        <Users size={16} className="text-cta" /> Squad de Tráfego
      </h3>
      <p className="text-text-muted text-xs mb-4">
        Pergunte sobre os anúncios deste cliente. O Traffic Chief escolhe o especialista certo automaticamente, ou você pode chamar um específico.
      </p>

      <div className="space-y-3">
        <select
          value={specialistId}
          onChange={(e) => setSpecialistId(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary/50"
        >
          <option value="auto">🎯 Deixar o Traffic Chief escolher</option>
          {plataforma.length > 0 && (
            <optgroup label="Especialistas de Plataforma">
              {plataforma.map((m) => (
                <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
              ))}
            </optgroup>
          )}
          {funcional.length > 0 && (
            <optgroup label="Especialistas Funcionais">
              {funcional.map((m) => (
                <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
              ))}
            </optgroup>
          )}
        </select>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Ex: por que meu CPA no Facebook está subindo?"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary/50 resize-none"
        />

        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Perguntar ao Squad
        </button>
      </div>

      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

      {answer && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-text-main font-semibold text-sm mb-2">
            {answer.specialist.emoji} {answer.specialist.name}
            {answer.autoRouted && <span className="text-text-disabled font-normal"> (escolhido pelo Traffic Chief)</span>}
          </p>
          <p className="text-text-main text-sm whitespace-pre-wrap leading-relaxed">{answer.content}</p>
        </div>
      )}
    </div>
  )
}
