'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Calendar,
  Mail,
  Sparkles,
  Loader2,
  AlertCircle,
  MapPin,
  Video,
  ExternalLink,
  Unplug,
  CalendarClock,
} from 'lucide-react'

interface AgendaEvent {
  id: string
  title: string
  start: string | null
  end: string | null
  location: string | null
  meetLink: string | null
  allDay: boolean
}

interface AgendaEmail {
  id: string
  subject: string
  from: string
  date: string | null
  snippet: string
  link: string
}

interface AgendaData {
  calendarConnected: boolean
  gmailConnected: boolean
  connectedEmailCalendar: string | null
  connectedEmailGmail: string | null
  events: AgendaEvent[]
  emails: AgendaEmail[]
  resumoIA: string | null
}

function formatDateTime(value: string | null, allDay: boolean) {
  if (!value) return ''
  const date = new Date(value)
  if (allDay) return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  return date.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ConnectCard({
  type,
  label,
  description,
  icon,
  connected,
  connectedEmail,
  onDisconnect,
}: {
  type: 'gmail' | 'google_calendar'
  label: string
  description: string
  icon: React.ReactNode
  connected: boolean
  connectedEmail: string | null
  onDisconnect: (type: 'gmail' | 'google_calendar') => void
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-text-main text-sm font-semibold">{label}</p>
          {connected ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              Conectado{connectedEmail ? ` · ${connectedEmail}` : ''}
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {connected ? (
        <button
          onClick={() => onDisconnect(type)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors shrink-0"
        >
          <Unplug size={13} /> Desconectar
        </button>
      ) : (
        <a
          href={`/api/integrations/connect/google?type=${type}&personal=1`}
          className="text-xs px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors shrink-0"
        >
          Conectar
        </a>
      )}
    </div>
  )
}

export function AgendaView() {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const fetchAgenda = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agenda')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao carregar a agenda.')
        setData(null)
        return
      }
      setData(json)
    } catch {
      setError('Erro ao carregar a agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  const handleDisconnect = async (type: 'gmail' | 'google_calendar') => {
    await fetch(`/api/integrations/personal?type=${type}`, { method: 'DELETE' })
    fetchAgenda()
  }

  const success = searchParams.get('success')

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

  if (!data) return null

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-text-main text-2xl font-bold flex items-center gap-2">
          <CalendarClock size={24} className="text-primary" /> Agenda
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Sua agenda e seus e-mails importantes, direto do seu Google, num lugar só.
        </p>
      </div>

      {success === 'google_connected' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
          Conectado com sucesso.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ConnectCard
          type="google_calendar"
          label="Google Agenda"
          description="Conecte pra ver suas reuniões e compromissos aqui."
          icon={<Calendar size={18} />}
          connected={data.calendarConnected}
          connectedEmail={data.connectedEmailCalendar}
          onDisconnect={handleDisconnect}
        />
        <ConnectCard
          type="gmail"
          label="Gmail"
          description="Conecte pra ver seus e-mails marcados como importantes."
          icon={<Mail size={18} />}
          connected={data.gmailConnected}
          connectedEmail={data.connectedEmailGmail}
          onDisconnect={handleDisconnect}
        />
      </div>

      {data.resumoIA && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="text-text-main text-sm font-bold uppercase tracking-wide">Resumo da IA</h2>
          </div>
          <p className="text-text-main text-sm leading-relaxed">{data.resumoIA}</p>
        </div>
      )}

      {(data.calendarConnected || data.gmailConnected) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h2 className="text-text-disabled text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Próximas reuniões
            </h2>
            {!data.calendarConnected ? (
              <p className="text-text-muted text-sm">Conecte o Google Agenda pra ver suas reuniões aqui.</p>
            ) : data.events.length === 0 ? (
              <p className="text-text-muted text-sm">Nada agendado nos próximos 14 dias.</p>
            ) : (
              <div className="space-y-2.5">
                {data.events.map((event) => (
                  <div key={event.id} className="bg-surface border border-border rounded-xl p-3.5">
                    <p className="text-text-main text-sm font-semibold">{event.title}</p>
                    <p className="text-text-muted text-xs mt-1">{formatDateTime(event.start, event.allDay)}</p>
                    {event.location && (
                      <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                        <MapPin size={11} /> {event.location}
                      </p>
                    )}
                    {event.meetLink && (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs mt-1 flex items-center gap-1 hover:underline w-fit"
                      >
                        <Video size={11} /> Entrar na chamada
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-text-disabled text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> E-mails importantes
            </h2>
            {!data.gmailConnected ? (
              <p className="text-text-muted text-sm">Conecte o Gmail pra ver seus e-mails importantes aqui.</p>
            ) : data.emails.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhum e-mail importante recente.</p>
            ) : (
              <div className="space-y-2.5">
                {data.emails.map((email) => (
                  <a
                    key={email.id}
                    href={email.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-surface border border-border rounded-xl p-3.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-text-main text-sm font-semibold">{email.subject}</p>
                      <ExternalLink size={12} className="text-text-disabled shrink-0 mt-0.5" />
                    </div>
                    <p className="text-text-muted text-xs mt-1">{email.from}</p>
                    <p className="text-text-muted text-xs mt-1 line-clamp-2">{email.snippet}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
