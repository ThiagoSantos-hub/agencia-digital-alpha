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
  Plus,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Users,
} from 'lucide-react'
import { useWhatsApp } from '@/hooks/useWhatsApp'
import { useAuth } from '@/hooks/useAuth'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { FeatureLock } from '@/components/ui/FeatureLock'

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
  createdBySystem: boolean
}

interface AgendaEmail {
  id: string
  subject: string
  from: string
  date: string | null
  snippet: string
  link: string
}

interface AgendaStats {
  reunioesHoje: number
  reunioesSemana: number
  emailsImportantes: number
}

interface AgendaData {
  calendarConnected: boolean
  gmailConnected: boolean
  connectedEmailCalendar: string | null
  connectedEmailGmail: string | null
  events: AgendaEvent[]
  emails: AgendaEmail[]
  resumoIA: string | null
  stats: AgendaStats
}

type DismissTarget =
  | { type: 'event'; id: string; title: string; createdBySystem: boolean }
  | { type: 'email'; id: string; title: string; createdBySystem: false }

function formatTime(value: string | null, allDay: boolean) {
  if (!value || allDay) return 'Dia todo'
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <h2 className="text-text-main text-sm font-bold">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-text-main text-2xl font-bold">{value}</p>
      <p className="text-text-muted text-xs mt-0.5">{label}</p>
    </div>
  )
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function CalendarGrid({
  calendarConnected,
  onDeleteRequest,
  dismissing,
  refreshKey,
}: {
  calendarConnected: boolean
  onDeleteRequest: (event: AgendaEvent) => void
  dismissing: string | null
  refreshKey: number
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const gridDays = useMemo(() => {
    const lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    const start = new Date(viewMonth)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(lastOfMonth)
    end.setDate(end.getDate() + (6 - end.getDay()))
    const days: Date[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [viewMonth])

  useEffect(() => {
    if (!calendarConnected || gridDays.length === 0) return
    const from = gridDays[0].toISOString()
    const to = new Date(gridDays[gridDays.length - 1].getTime() + 86_400_000).toISOString()
    fetch(`/api/agenda/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((res) => res.json())
      .then((json) => setEvents(json.events ?? []))
      .catch(() => setEvents([]))
  }, [calendarConnected, gridDays, refreshKey])

  const eventsForDay = (day: Date) => events.filter((e) => e.start && new Date(e.start).toDateString() === day.toDateString())

  if (!calendarConnected) {
    return <p className="text-text-muted text-sm">Conecte o Google Agenda pra ver o calendário aqui.</p>
  }

  const today = new Date()
  const monthLabel = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-main text-sm font-semibold capitalize">{monthLabel}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-hover-bg text-text-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-xs px-2.5 py-1 rounded-lg hover:bg-hover-bg text-text-muted font-medium"
          >
            Hoje
          </button>
          <button
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-hover-bg text-text-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <p key={d} className="text-[10px] font-bold uppercase text-text-disabled py-1">{d}</p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {gridDays.map((day) => {
          const inMonth = day.getMonth() === viewMonth.getMonth()
          const isToday = day.toDateString() === today.toDateString()
          const isSelected = selectedDay?.toDateString() === day.toDateString()
          const dayEvents = eventsForDay(day)
          const visibleEvents = dayEvents.slice(0, 2)
          const extraCount = dayEvents.length - visibleEvents.length
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`min-h-[3.25rem] rounded-lg p-1 text-left flex flex-col gap-0.5 border transition-colors overflow-hidden ${
                isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
              } ${!inMonth ? 'opacity-40' : ''}`}
            >
              <span className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-primary text-white font-bold' : 'text-text-main'}`}>
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {visibleEvents.map((e) => (
                  <span
                    key={e.id}
                    className="text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary font-medium truncate"
                  >
                    {!e.allDay && e.start ? `${formatTime(e.start, false)} ` : ''}{e.title}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="text-[10px] text-text-muted px-1">+{extraCount} mais</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-text-disabled text-[11px] font-bold uppercase tracking-wide mb-2">
            {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-text-muted text-sm">Nada agendado nesse dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div key={event.id} className="group bg-surface border border-border rounded-xl p-3.5 flex gap-3 hover:border-primary/30 transition-colors">
                  <div className="w-14 shrink-0 text-xs font-semibold text-primary pt-0.5">{formatTime(event.start, event.allDay)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-main text-sm font-semibold truncate">{event.title}</p>
                    {event.location && (
                      <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                        <MapPin size={11} className="shrink-0" /> <span className="truncate">{event.location}</span>
                      </p>
                    )}
                    {event.meetLink && (
                      <a href={event.meetLink} target="_blank" rel="noreferrer" className="text-primary text-xs mt-1 flex items-center gap-1 hover:underline w-fit">
                        <Video size={11} /> Entrar na chamada
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteRequest(event)}
                    disabled={dismissing === event.id}
                    title="Excluir"
                    className="opacity-0 group-hover:opacity-100 text-text-disabled hover:text-red-500 transition-all shrink-0 h-fit disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-main">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-hover-bg">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-colors'
const labelCls = 'block text-xs font-semibold text-text-main mb-1'

export function AgendaView() {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<DismissTarget | null>(null)
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [showNewEmail, setShowNewEmail] = useState(false)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
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

  const confirmDismiss = async () => {
    if (!confirmTarget) return
    const { type, id, createdBySystem } = confirmTarget
    setDismissing(id)
    await fetch('/api/agenda/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, deleteFromGoogle: createdBySystem }),
    })
    setData((prev) => {
      if (!prev) return prev
      return type === 'event'
        ? { ...prev, events: prev.events.filter((e) => e.id !== id) }
        : { ...prev, emails: prev.emails.filter((e) => e.id !== id) }
    })
    setDismissing(null)
    setConfirmTarget(null)
    if (type === 'event') setCalendarRefreshKey((k) => k + 1)
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
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-text-main text-2xl font-bold flex items-center gap-2">
            <CalendarClock size={24} className="text-primary" /> Agenda
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Suas reuniões e seus e-mails, direto do seu Google, num lugar só.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewMeeting(true)}
            disabled={!data.calendarConnected}
            title={!data.calendarConnected ? 'Conecte o Google Agenda primeiro' : ''}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            <Plus size={14} /> Nova reunião
          </button>
          <FeatureLock featureKey="agenda.enviar_email" variant="replace">
            <button
              onClick={() => setShowNewEmail(true)}
              disabled={!data.gmailConnected}
              title={!data.gmailConnected ? 'Conecte o Gmail primeiro' : ''}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-surface border border-border hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed text-text-main font-medium transition-colors"
            >
              <Send size={14} /> Novo e-mail
            </button>
          </FeatureLock>
        </div>
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
          description="Conecte pra ver e criar suas reuniões aqui."
          connected={data.calendarConnected}
          connectedEmail={data.connectedEmailCalendar}
          onDisconnect={handleDisconnect}
        />
        <ConnectCard
          type="gmail"
          label="Gmail"
          description="Conecte pra ver e-mails importantes e enviar e-mail daqui."
          connected={data.gmailConnected}
          connectedEmail={data.connectedEmailGmail}
          onDisconnect={handleDisconnect}
        />
      </div>

      {(data.calendarConnected || data.gmailConnected) && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Reuniões hoje" value={data.stats.reunioesHoje} />
          <StatCard label="Reuniões nos próximos 7 dias" value={data.stats.reunioesSemana} />
          <StatCard label="E-mails importantes" value={data.stats.emailsImportantes} />
        </div>
      )}

      {data.resumoIA && (
        <FeatureLock featureKey="agenda.resumo_ia">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-primary" />
              <h2 className="text-text-main text-sm font-bold uppercase tracking-wide">Resumo da IA</h2>
            </div>
            <p className="text-text-main text-sm leading-relaxed">{data.resumoIA}</p>
          </div>
        </FeatureLock>
      )}

      <div>
        <SectionHeader icon={<Calendar size={13} />} title="Calendário" />
        <div className="bg-surface border border-border rounded-xl p-4">
          <CalendarGrid
            calendarConnected={data.calendarConnected}
            dismissing={dismissing}
            refreshKey={calendarRefreshKey}
            onDeleteRequest={(event) =>
              setConfirmTarget({ type: 'event', id: event.id, title: event.title, createdBySystem: event.createdBySystem })
            }
          />
        </div>
      </div>

      {(data.calendarConnected || data.gmailConnected) && (
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
                        onClick={() => setConfirmTarget({ type: 'email', id: email.id, title: email.subject, createdBySystem: false })}
                        disabled={dismissing === email.id}
                        title="Excluir"
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
      )}

      {confirmTarget && (
        <Modal title={confirmTarget.type === 'event' ? 'Excluir reunião?' : 'Excluir e-mail da lista?'} onClose={() => setConfirmTarget(null)}>
          <p className="text-text-main text-sm font-semibold mb-2">{confirmTarget.title}</p>
          <p className="text-text-muted text-sm mb-5">
            {confirmTarget.type === 'event'
              ? confirmTarget.createdBySystem
                ? 'Essa reunião foi criada por aqui e será apagada de verdade do seu Google Agenda também.'
                : 'Isso só esconde a reunião desta tela. Ela continua existindo normalmente no seu Google Agenda.'
              : 'Isso só esconde o e-mail desta tela. Ele continua no seu Gmail normalmente, nada é apagado de verdade.'}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setConfirmTarget(null)} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
              Não
            </button>
            <button
              onClick={confirmDismiss}
              disabled={dismissing === confirmTarget.id}
              className="text-xs px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              Sim, excluir
            </button>
          </div>
        </Modal>
      )}

      {showNewMeeting && (
        <NewMeetingModal
          onClose={() => setShowNewMeeting(false)}
          onCreated={() => {
            setShowNewMeeting(false)
            fetchAgenda()
          }}
        />
      )}

      {showNewEmail && (
        <NewEmailModal
          onClose={() => setShowNewEmail(false)}
          onSent={() => setShowNewEmail(false)}
        />
      )}
    </div>
  )
}

function NewMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { isLocked: isPlanLocked } = usePlanFeatures()
  const meetLinkLocked = isPlanLocked('agenda.meet_automatico')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [attendees, setAttendees] = useState('')
  const [createMeetLink, setCreateMeetLink] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [whatsappTipo, setWhatsappTipo] = useState<'nenhum' | 'privado' | 'grupo'>('nenhum')
  const [whatsappNumero, setWhatsappNumero] = useState('')
  const [whatsappGrupo, setWhatsappGrupo] = useState('')
  const { role } = useAuth()
  // Pra quem é admin, "grupos da agência" e "meus grupos" são o mesmo
  // WhatsApp conectado (a própria instância dele) — mostrar as duas listas
  // só faz sentido pra quem não é admin (colaborador ou gestor).
  const isColaborador = role !== 'admin'
  const { groups: gruposAgencia, loadingGroups: carregandoGruposAgencia } = useWhatsApp('agency')
  const { groups: gruposProprios, loadingGroups: carregandoGruposProprios } = useWhatsApp('own')
  const grupoEscolhidoNaAgencia = !isColaborador || gruposAgencia.some((g) => g.group_id === whatsappGrupo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !date || !startTime || !endTime) {
      setError('Título, data, início e fim são obrigatórios.')
      return
    }
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    if (end <= start) {
      setError('O horário de fim precisa ser depois do início.')
      return
    }
    const attendeeEmails = attendees
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
    const invalidEmail = attendeeEmails.find((email) => !email.includes('@'))
    if (invalidEmail) {
      setError(`"${invalidEmail}" não parece um e-mail válido.`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/agenda/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          location: location || undefined,
          start: start.toISOString(),
          end: end.toISOString(),
          attendees: attendeeEmails,
          createMeetLink: meetLinkLocked ? false : createMeetLink,
          whatsappDestino: whatsappTipo === 'privado' ? whatsappNumero.replace(/\D/g, '') : whatsappTipo === 'grupo' ? whatsappGrupo : undefined,
          whatsappFonte: whatsappTipo === 'grupo' && grupoEscolhidoNaAgencia ? 'agency' : 'own',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao criar a reunião.')
        return
      }
      onCreated()
    } catch {
      setError('Erro ao criar a reunião.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Nova reunião" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Título *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reunião com o cliente X" />
        </div>
        <div>
          <label className={labelCls}>Descrição</label>
          <textarea className={`${inputCls} min-h-[70px] resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pauta, observações..." />
        </div>
        <div>
          <label className={labelCls}>Participantes</label>
          <input className={inputCls} value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="fulano@empresa.com, ciclano@empresa.com" />
          <p className="text-[11px] text-text-muted mt-1">Separe os e-mails por vírgula. Cada um recebe o convite direto por e-mail.</p>
        </div>
        <FeatureLock featureKey="agenda.meet_automatico">
          <label className="flex items-center gap-2 text-xs text-text-main cursor-pointer">
            <input type="checkbox" checked={createMeetLink} onChange={(e) => setCreateMeetLink(e.target.checked)} className="rounded border-border" />
            Criar link de videochamada (Google Meet) automaticamente
          </label>
        </FeatureLock>

        <div className="bg-background border border-border rounded-lg p-3 space-y-2">
          <label className={labelCls}>Avisar por WhatsApp (opcional)</label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setWhatsappTipo('nenhum')} className={`text-xs px-2 py-1.5 rounded-lg border ${whatsappTipo === 'nenhum' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-muted'}`}>Nenhum</button>
            <button type="button" onClick={() => setWhatsappTipo('privado')} className={`flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border ${whatsappTipo === 'privado' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-muted'}`}><Smartphone size={12} /> Número</button>
            <button type="button" onClick={() => setWhatsappTipo('grupo')} className={`flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border ${whatsappTipo === 'grupo' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-muted'}`}><Users size={12} /> Grupo</button>
          </div>

          {whatsappTipo === 'privado' && (
            <input
              className={inputCls}
              value={whatsappNumero}
              onChange={(e) => setWhatsappNumero(e.target.value.replace(/\D/g, ''))}
              placeholder="5511999999999"
            />
          )}

          {whatsappTipo === 'grupo' && (
            carregandoGruposAgencia || (isColaborador && carregandoGruposProprios) ? (
              <div className={inputCls}>Carregando grupos...</div>
            ) : gruposAgencia.length > 0 || (isColaborador && gruposProprios.length > 0) ? (
              <select className={inputCls} value={whatsappGrupo} onChange={(e) => setWhatsappGrupo(e.target.value)}>
                <option value="">Selecione...</option>
                {isColaborador ? (
                  <>
                    {gruposAgencia.length > 0 && (
                      <optgroup label="Grupos da Agência">
                        {gruposAgencia.map((g) => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                      </optgroup>
                    )}
                    {gruposProprios.length > 0 && (
                      <optgroup label="Meus Grupos">
                        {gruposProprios.map((g) => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
                      </optgroup>
                    )}
                  </>
                ) : (
                  gruposAgencia.map((g) => <option key={g.group_id} value={g.group_id}>{g.name}</option>)
                )}
              </select>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                Nenhum grupo encontrado. Conecte o WhatsApp em Integrações.
              </div>
            )
          )}

          {whatsappTipo !== 'nenhum' && (
            <p className="text-[11px] text-text-muted">Manda um aviso automático com título, data/hora e link da reunião assim que ela for criada.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Local {createMeetLink ? '(opcional, além da videochamada)' : ''}</label>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço, se for presencial" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Data *</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Início *</label>
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Fim *</label>
            <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="text-xs px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-50">
            {saving ? 'Criando...' : 'Criar reunião'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NewEmailModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to || !subject || !body) {
      setError('Destinatário, assunto e mensagem são obrigatórios.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/agenda/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Erro ao enviar o e-mail.')
        return
      }
      setSent(true)
      setTimeout(onSent, 1200)
    } catch {
      setError('Erro ao enviar o e-mail.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal title="Novo e-mail" onClose={onClose}>
      {sent ? (
        <p className="text-emerald-600 text-sm font-medium">E-mail enviado com sucesso.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Para *</label>
            <input type="email" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="destinatario@exemplo.com" />
          </div>
          <div>
            <label className={labelCls}>Assunto *</label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do e-mail" />
          </div>
          <div>
            <label className={labelCls}>Mensagem *</label>
            <textarea className={`${inputCls} min-h-[140px] resize-none`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..." />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={sending} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-50">
              <Send size={13} /> {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
