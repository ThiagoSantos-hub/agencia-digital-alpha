'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users,
  CheckSquare, 
  Megaphone, 
  Wallet, 
  Plug, 
  UserCircle, 
  LogOut,
  Bell,
  CheckCheck,
  X
} from 'lucide-react'
import { useNotificacoes } from '@/hooks/useNotificacoes'

const menuItems = [
  { label: 'Dashboard', href: '/colaborador/dashboard', icon: LayoutDashboard },
  { label: 'Tarefas', href: '/colaborador/tarefas', icon: CheckSquare },
  { label: 'Checklists', href: '/colaborador/checklists', icon: CheckSquare },
  { label: 'Meus Clientes', href: '/colaborador/meus-clientes', icon: Users },
  { label: 'Clientes Agência', href: '/colaborador/clientes', icon: Users },
  { label: 'Campanhas', href: '/colaborador/campanhas', icon: Megaphone },
  { label: 'Financeiro', href: '/colaborador/financeiro', icon: Wallet },
  { label: 'Integrações', href: '/colaborador/integracoes', icon: Plug },
  { label: 'Perfil', href: '/colaborador/perfil', icon: UserCircle },
]

// ── Ícone por tipo de notificação ─────────────────────────────
function iconeTipo(tipo: string) {
  switch (tipo) {
    case 'vencimento_5dias':   return '⚠️'
    case 'vencimento_hoje':    return '🔴'
    case 'pagamento_recebido': return '✅'
    default:                   return '🔔'
  }
}

// ── Formata data relativa ─────────────────────────────────────
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

  // Fecha o painel ao clicar fora
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
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'collaborator') {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0f0c] border-r border-[#1a3a24] flex flex-col z-40">
        <div className="px-6 py-5 border-b border-[#1a3a24]">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg tracking-tight">DIGITAL</span>
            <span className="text-[#00ff88] font-black text-lg tracking-tight">ALPHA</span>
          </div>
          <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest mt-1">Painel Colaborador</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                prefetch={false}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/40'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#1a3a24]">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col h-full">
        {/* Header */}
        <header className="h-16 border-b border-[#1a3a24] bg-[#0a0f0c] px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-medium text-gray-400">Bem-vindo de volta,</h2>
            <p className="text-white font-bold">{profile.name || profile.email}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* ── SINO DE NOTIFICAÇÕES ── */}
            <div ref={sinoRef} className="relative">
              <button
                onClick={() => setSinoAberto(prev => !prev)}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${
                  naoLidas > 0 
                    ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
                    : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/40'
                }`}
                aria-label="Notificações"
              >
                <Bell size={18} className={naoLidas > 0 ? 'fill-amber-400' : ''} />
                {naoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none border-2 border-[#0a0f0c]">
                    {naoLidas > 99 ? '99+' : naoLidas}
                  </span>
                )}
              </button>

              {/* Painel de notificações */}
              {sinoAberto && (
                <div className="absolute right-0 top-11 w-80 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl shadow-2xl z-50 flex flex-col max-h-[480px]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3a24]">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">Notificações</span>
                      {naoLidas > 0 && (
                        <span className="bg-[#00ff88]/10 text-[#00ff88] text-xs font-medium px-2 py-0.5 rounded-full border border-[#00ff88]/20">
                          {naoLidas} nova{naoLidas !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {naoLidas > 0 && (
                        <button
                          onClick={marcarTodasComoLidas}
                          title="Marcar todas como lidas"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors"
                        >
                          <CheckCheck size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setSinoAberto(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a3a24]/40 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loadingNotif ? (
                      <div className="py-10 text-center text-gray-500 text-sm">Carregando...</div>
                    ) : notificacoes.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell size={28} className="mx-auto text-gray-700 mb-2" />
                        <p className="text-gray-500 text-sm">Nenhuma notificação</p>
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.lida && marcarComoLida(n.id)}
                          className={`flex gap-3 px-4 py-3 border-b border-[#1a3a24]/50 last:border-0 transition-colors cursor-pointer
                            ${n.lida
                              ? 'opacity-50 hover:opacity-70'
                              : 'hover:bg-[#1a3a24]/30'
                            }`}
                        >
                          <span className="text-lg flex-shrink-0 mt-0.5">{iconeTipo(n.tipo)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${n.lida ? 'text-gray-400' : 'text-white'}`}>
                              {n.titulo}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {n.mensagem}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-1">
                              {tempoRelativo(n.created_at)}
                            </p>
                          </div>
                          {!n.lida && (
                            <span className="w-2 h-2 bg-[#00ff88] rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Rodapé */}
                  {notificacoes.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-[#1a3a24] text-center">
                      <p className="text-xs text-gray-600">
                        {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} no total
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold uppercase">
              {profile.name?.[0] || profile.email?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
