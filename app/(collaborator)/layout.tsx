'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { 
  LayoutDashboard, 
  Users,
  UsersRound,
  CheckSquare, 
  Megaphone, 
  Wallet, 
  Plug, 
  UserCircle, 
  LogOut,
  Bell,
  CheckCheck,
  X,
  Sparkles,
  MessageSquare,
  BarChart2,
  List,
  Rocket
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { PageFade } from '@/components/ui/Motion'
import { CollaboratorNavLink } from '@/components/layout/CollaboratorNavLink'
import { NotificationToasts } from '@/components/layout/NotificationToasts'
import { NotificationPermissionPrompt } from '@/components/layout/NotificationPermissionPrompt'
import { springSoft } from '@/lib/motion'

const menuGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Novidades',  href: '/colaborador/novidades', icon: Sparkles,      ativo: true },
      { label: 'Próximas Atualizações', href: '/colaborador/atualizacoes', icon: Rocket, ativo: true },
      { label: 'Feedback',   href: '/colaborador/feedbacks',  icon: MessageSquare, ativo: true },
    ],
  },
  {
    label: 'CLIENTES & CAMPANHAS',
    items: [
      { label: 'Meus Clientes',    href: '/colaborador/meus-clientes',    icon: Users,      ativo: true },
      { label: 'Clientes Agência', href: '/colaborador/clientes',         icon: UsersRound, ativo: true },
      { label: 'Campanhas',        href: '/colaborador/campanhas',        icon: Megaphone,  ativo: true  },
      { label: 'Relatórios',       href: '/colaborador/relatorios',       icon: BarChart2,  ativo: true },
      { label: 'Alertas',          href: '/colaborador/alertas',          icon: Bell,       ativo: true },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { label: 'Tarefas',    href: '/colaborador/tarefas',    icon: CheckSquare, ativo: true },
      { label: 'Checklists', href: '/colaborador/checklists', icon: List,        ativo: true },
      { label: 'Financeiro', href: '/colaborador/financeiro', icon: Wallet,      ativo: true },
    ],
  },
  {
    label: 'FERRAMENTAS',
    items: [
      { label: 'Integrações', href: '/colaborador/integracoes', icon: Plug, ativo: true },
    ],
  },
  {
    label: 'OUTROS',
    items: [
      { label: 'Perfil',    href: '/colaborador/perfil',    icon: UserCircle,    ativo: true  },
    ],
  },
]

function iconeTipo(tipo: string) {
  switch (tipo) {
    case 'vencimento_5dias':   return '⚠️'
    case 'vencimento_hoje':    return '🔴'
    case 'pagamento_recebido': return '✅'
    default:                   return '🔔'
  }
}

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  if (min < 1)  return 'agora'
  if (min < 60) return `${min}min atrás`
  if (h < 24)   return `${h}h atrás`
  return `${d}d atrás`
}

export default function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const didRedirect = useRef(false)

  const {
    notificacoes,
    naoLidas,
    loading: loadingNotif,
    marcarComoLida,
    marcarTodasComoLidas,
  } = useNotificacoes()

  const [sinoAberto, setSinoAberto] = useState(false)
  const sinoRef = useRef<HTMLDivElement>(null)
  const [temNovidade, setTemNovidade] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.id) return

    const checkNovidades = async () => {
      const { data, error } = await supabase
        .from('novidades')
        .select('lida_por')

      if (error) {
        console.error('Erro ao verificar novidades:', error)
        return
      }

      if (data) {
        const naoLidasNov = data.some(n => !n.lida_por?.includes(profile.id))
        setTemNovidade(naoLidasNov)
      }
    }

    checkNovidades()

    const channel = supabase
      .channel('menu_novidades_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'novidades' },
        () => checkNovidades()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (sinoRef.current && !sinoRef.current.contains(e.target as Node)) {
        setSinoAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  useEffect(() => {
    if (loading || didRedirect.current) return

    if (!profile) {
      didRedirect.current = true
      router.replace('/login')
    } else if (profile.role !== 'collaborator') {
      didRedirect.current = true
      router.replace('/login')
    }
  }, [profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'collaborator') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-text-main flex overflow-hidden">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-40 shadow-elevated-md">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-text-main font-black text-lg tracking-tight">DIGITAL</span>
            <span className="text-primary font-black text-lg tracking-tight">ALPHA</span>
          </div>
          <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest mt-1">Painel Colaborador</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4 custom-scrollbar">
          <div className="mb-2">
            <CollaboratorNavLink
              href="/colaborador/dashboard"
              active={pathname === '/colaborador/dashboard' || pathname.startsWith('/colaborador/dashboard/')}
            >
              <LayoutDashboard size={18} />
              <span className="text-sm font-semibold">Dashboard</span>
            </CollaboratorNavLink>
          </div>

          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const isNovidades = item.label === 'Novidades'
                  const showPulse = isNovidades && temNovidade

                  if (!item.ativo) return (
                    <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-disabled cursor-not-allowed opacity-50">
                      <Icon size={18} />
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="ml-auto text-xs bg-hover-bg text-text-muted px-1.5 py-0.5 rounded-md">Em breve</span>
                    </div>
                  )
                  return (
                    <CollaboratorNavLink key={item.href} href={item.href} active={isActive} pulse={showPulse}>
                      <Icon size={18} className={showPulse ? 'fill-amber-500' : ''} />
                      <span className={`text-sm font-semibold ${showPulse ? 'text-amber-600' : ''}`}>{item.label}</span>
                    </CollaboratorNavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <motion.button
            onClick={() => signOut()}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={springSoft}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sair do sistema</span>
          </motion.button>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border bg-surface px-8 flex items-center justify-between shrink-0 shadow-elevated-sm">
          <div>
            <h2 className="text-sm font-medium text-text-muted">Bem-vindo de volta,</h2>
            <p className="text-text-main font-bold">{profile.name || profile.email}</p>
          </div>

          <div className="flex items-center gap-4">
            <div ref={sinoRef} className="relative">
              <motion.button
                onClick={() => setSinoAberto(prev => !prev)}
                whileTap={{ scale: 0.92 }}
                transition={springSoft}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl shadow-elevated-sm ${
                  naoLidas > 0 
                    ? 'text-amber-600 bg-amber-50 border border-amber-200' 
                    : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                }`}
                aria-label="Notificações"
              >
                <Bell size={18} className={naoLidas > 0 ? 'fill-amber-500' : ''} />
                {naoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none border-2 border-surface">
                    {naoLidas > 99 ? '99+' : naoLidas}
                  </span>
                )}
              </motion.button>

              {sinoAberto && (
                <div className="absolute right-0 top-11 w-80 bg-surface border border-border rounded-xl shadow-elevated-lg z-50 flex flex-col max-h-[480px]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-text-main font-semibold text-sm">Notificações</span>
                      {naoLidas > 0 && (
                        <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/20">
                          {naoLidas} nova{naoLidas !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {naoLidas > 0 && (
                        <button
                          onClick={marcarTodasComoLidas}
                          title="Marcar todas como lidas"
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <CheckCheck size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setSinoAberto(false)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loadingNotif ? (
                      <div className="py-10 text-center text-text-muted text-sm">Carregando...</div>
                    ) : notificacoes.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell size={28} className="mx-auto text-text-disabled mb-2" />
                        <p className="text-text-muted text-sm">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.lida && marcarComoLida(n.id)}
                          className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors cursor-pointer
                            ${n.lida ? 'opacity-50 hover:opacity-70' : 'hover:bg-hover-bg'}`}
                        >
                          <span className="text-lg flex-shrink-0 mt-0.5">{iconeTipo(n.tipo)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${n.lida ? 'text-text-muted' : 'text-text-main'}`}>
                              {n.titulo}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5 leading-snug line-clamp-2">
                              {n.mensagem}
                            </p>
                            <p className="text-[10px] text-text-disabled mt-1">
                              {tempoRelativo(n.created_at)}
                            </p>
                          </div>
                          {!n.lida && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {notificacoes.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border text-center">
                      <p className="text-xs text-text-disabled">
                        {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} no total
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-elevated-sm">
                <span className="text-primary text-sm font-bold">{(profile.name || profile.email).charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background">
          <PageFade key={pathname}>
            {children}
          </PageFade>
        </main>
      </div>

      <NotificationToasts />
      <NotificationPermissionPrompt />
    </div>
  )
}
