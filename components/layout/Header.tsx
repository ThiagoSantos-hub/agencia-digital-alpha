'use client'
// components/layout/Header.tsx — v0.3.1
// Atualização: remoção do botão sair do topo
// Projeto: Agência Digital Alpha

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
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
  const { profile, role } = useAuth()
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

  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'
  const nome      = profile?.name ?? profile?.email ?? 'Usuário'
  const inicial   = nome.charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 shadow-sm">
      {/* Título */}
      <div>
        <h2 className="text-text-main font-bold text-sm">Painel de Controle</h2>
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Agência Digital Alpha</p>
      </div>

      {/* Lado direito */}
      <div className="flex items-center gap-4">

        {/* ── SINO DE NOTIFICAÇÕES ── */}
        <div ref={sinoRef} className="relative">
          <button
            onClick={() => setSinoAberto(prev => !prev)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${
              naoLidas > 0 
                ? 'text-amber-600 bg-amber-50 border border-amber-200 shadow-sm' 
                : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
            }`}
            aria-label="Notificações"
          >
            <Bell size={18} className={naoLidas > 0 ? 'fill-amber-600' : ''} />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-text-main text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none border-2 border-surface">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </button>

          {/* Painel de notificações */}
          {sinoAberto && (
            <div className="absolute right-0 top-11 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[480px]">
              {/* Cabeçalho do painel */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-text-main font-bold text-sm">Notificações</span>
                  {naoLidas > 0 && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                      {naoLidas} nova{naoLidas !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodasComoLidas}
                      title="Marcar todas como lidas"
                      className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  {notificacoes.length > 0 && (
                    <button
                      onClick={limparTodas}
                      title="Limpar todas"
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
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

              {/* Lista */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                      className={`flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors cursor-pointer
                        ${n.lida
                          ? 'opacity-50 hover:opacity-70'
                          : 'hover:bg-hover-bg'
                        }`}
                    >
                      {/* Ícone */}
                      <span className="text-lg flex-shrink-0 mt-0.5">{iconeTipo(n.tipo)}</span>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-snug ${n.lida ? 'text-text-muted' : 'text-text-main'}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 leading-snug line-clamp-2">
                          {n.mensagem}
                        </p>
                        <p className="text-[10px] text-text-disabled mt-1 font-medium">
                          {tempoRelativo(n.created_at)}
                        </p>
                      </div>

                      {/* Bolinha não lida */}
                      {!n.lida && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5 shadow-sm shadow-primary/30" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Rodapé */}
              {notificacoes.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border text-center">
                  <p className="text-[10px] text-text-disabled font-bold uppercase tracking-widest">
                    {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} no total
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PERFIL DO USUÁRIO ── */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-primary text-xs font-black">{inicial}</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-text-main text-sm font-bold leading-none">{nome}</p>
            <p className="text-text-disabled text-[10px] font-bold uppercase tracking-wider mt-1">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
