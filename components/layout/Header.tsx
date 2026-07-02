'use client'
// components/layout/Header.tsx — v0.3.0
// Atualização: sino de notificações com badge + painel dropdown
// Projeto: Agência Digital Alpha

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { LogOut, Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export function Header() {
  const { profile, role, signOut } = useAuth()
  const router = useRouter()

  const {
    notificacoes,
    naoLidas,
    loading: loadingNotif,
    marcarComoLida,
    marcarTodasComoLidas,
    limparTodas,
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

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'
  const nome      = profile?.name ?? profile?.email ?? 'Usuário'
  const inicial   = nome.charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-[#0a0f0c] border-b border-[#1a3a24] flex items-center justify-between px-6">
      {/* Título */}
      <div>
        <h2 className="text-white font-semibold text-sm">Painel de Controle</h2>
        <p className="text-gray-500 text-xs">Agência Digital Alpha</p>
      </div>

      {/* Lado direito */}
      <div className="flex items-center gap-4">

        {/* ── SINO DE NOTIFICAÇÕES ── */}
        <div ref={sinoRef} className="relative">
          <button
            onClick={() => setSinoAberto(prev => !prev)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#1a3a24]/40 transition-colors"
            aria-label="Notificações"
          >
            <Bell size={18} />
            {naoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#00ff88] text-[#0a0f0c] text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </button>

          {/* Painel de notificações */}
          {sinoAberto && (
            <div className="absolute right-0 top-11 w-80 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl shadow-2xl z-50 flex flex-col max-h-[480px]">
              {/* Cabeçalho do painel */}
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
                  {notificacoes.length > 0 && (
                    <button
                      onClick={limparTodas}
                      title="Limpar todas"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={15} />
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

              {/* Lista */}
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
                      {/* Ícone */}
                      <span className="text-lg flex-shrink-0 mt-0.5">{iconeTipo(n.tipo)}</span>

                      {/* Conteúdo */}
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

                      {/* Bolinha não lida */}
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

        {/* ── PERFIL DO USUÁRIO ── */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/40 flex items-center justify-center">
            <span className="text-[#00ff88] text-sm font-bold">{inicial}</span>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium leading-none">{nome}</p>
            <p className="text-gray-500 text-xs mt-0.5">{roleLabel}</p>
          </div>
        </div>

        {/* ── SAIR ── */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a3a24]/40 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
