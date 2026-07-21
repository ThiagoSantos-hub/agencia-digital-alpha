'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  MapPin,
  Video,
  ExternalLink,
  Unplug,
  CalendarClock,
  Calendar,
  Mail,
  Trash2,
} from 'lucide-react'

const PLATFORM_LOGOS: Record<'gmail' | 'google_calendar', string> = {
  gmail: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
  google_calendar: 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
}

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

function formatTime(value: string | null, allDay: boolean) {
  if (!value || allDay) return 'Dia todo'
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDayHeader(value: string | null) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Hoje'
  if (sameDay(date, tomorrow)) return 'Amanhã'
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function parseFromName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*<.*>$/)
  const name = (match ? match[1] : from).trim()
  return { name, initial: name.charAt(0).toUpperCase() || '?' }
}

function ConnectCard({
  type,
  label,
  description,
  connected,
  connectedEmail,
  onDisconnect,
}: {
  type: 'gmail' | 'google_calendar'
  label: string
  description: string
  connected: boolean
  connectedEmail: string | null
  onDisconnect: (type: 'gmail' | 'google_calendar') => void
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
          <img src={PLATFORM_LOGOS[type]} alt={label} width={22} height={22} className="w-[22px] h-[22px] object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-text-main text-sm font-semibold">{label}</p>
          {connected ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {connectedEmail || 'Conectado'}
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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <h2 className="text-text-main text-sm font-bold">{title}</h2>
    </div>
  )
}

export function AgendaView() {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)
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

  const dismiss = async (type: 'event' | 'email', id: string) => {
    setDismissing(id)
    await fetch('/api/agenda/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    })
    setData((prev) => {
      if (!prev) return prev
      return type === 'event'
        ? { ...prev, events: prev.events.filter((e) => e.id !== id) }
        : { ...prev, emails: prev.emails.filter((e) => e.id !== id) }
    })
    setDismissing(null)
  }

  const eventsByDay = useMemo(() => {
    if (!data) return []
    const groups = new Map<string, AgendaEvent[]>()
    for (const event of data.events) {
      const key = event.start ? new Date(event.start).toDateString() : 'sem-data'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(event)
    }
    return Array.from(groups.entries()).map(([key, events]) => ({
      header: formatDayHeader(events[0]?.start ?? null),
      key,
      events,
    }))
  }, [data])

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
          connected={data.calendarConnected}
          connectedEmail={data.connectedEmailCalendar}
          onDisconnect={handleDisconnect}
        />
        <ConnectCard
          type="gmail"
          label="Gmail"
          description="Conecte pra ver seus e-mails marcados como importantes."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <SectionHeader icon={<Calendar size={13} />} title="Próximas reuniões" />
            {!data.calendarConnected ? (
              <p className="text-text-muted text-sm">Conecte o Google Agenda pra ver suas reuniões aqui.</p>
            ) : data.events.length === 0 ? (
              <p className="text-text-muted text-sm">Nada agendado nos próximos 14 dias.</p>
            ) : (
              <div className="space-y-4">
                {eventsByDay.map((group) => (
                  <div key={group.key}>
                    <p className="text-text-disabled text-[11px] font-bold uppercase tracking-wide mb-2">{group.header}</p>
                    <div className="space-y-2">
                      {group.events.map((event) => (
                        <div
                          key={event.id}
                          className="group bg-surface border border-border rounded-xl p-3.5 flex gap-3 hover:border-primary/30 transition-colors"
                        >
                          <div className="w-14 shrink-0 text-xs font-semibold text-primary pt-0.5">
                            {formatTime(event.start, event.allDay)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-main text-sm font-semibold truncate">{event.title}</p>
                            {event.location && (
                              <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" /> <span className="truncate">{event.location}</span>
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
                          <button
                            onClick={() => dismiss('event', event.id)}
                            disabled={dismissing === event.id}
                            title="Esconder da agenda"
                            className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-red-500 transition-all shrink-0 h-fit disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={<Mail size={13} />} title="E-mails importantes" />
            {!data.gmailConnected ? (
              <p className="text-text-muted text-sm">Conecte o Gmail pra ver seus e-mails importantes aqui.</p>
            ) : data.emails.length === 0 ? (
              <p className="text-text-muted text-sm">Nenhum e-mail importante recente.</p>
            ) : (
              <div className="space-y-2">
                {data.emails.map((email) => {
                  const { name, initial } = parseFromName(email.from)
                  return (
                    <div
                      key={email.id}
                      className="group bg-surface border border-border rounded-xl p-3.5 flex gap-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <a href={email.link} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-text-main text-sm font-semibold truncate">{email.subject}</p>
                          <ExternalLink size={12} className="text-text-disabled shrink-0 mt-0.5" />
                        </div>
                        <p className="text-text-muted text-xs mt-0.5 truncate">{name}</p>
                        <p className="text-text-muted text-xs mt-1 line-clamp-2">{email.snippet}</p>
                      </a>
                      <button
                        onClick={() => dismiss('email', email.id)}
                        disabled={dismissing === email.id}
                        title="Esconder da agenda"
                        className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-red-500 transition-all shrink-0 h-fit disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
