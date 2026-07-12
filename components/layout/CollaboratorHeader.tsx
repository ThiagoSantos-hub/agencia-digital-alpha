'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'

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

export function CollaboratorHeader() {
  const { profile } = useAuth()
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

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (sinoRef.current && !sinoRef.current.contains(e.target as Node)) {
        setSinoAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const nome = profile?.name ?? profile?.email ?? 'Colaborador'
  const inicial = nome.charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="text-[#1E293B] font-semibold text-sm">Painel do Colaborador</h2>
        <p className="text-[#64748B] text-xs">Agência Digital Alpha</p>
      </div>

      <div className="flex items-center gap-4">
        <div ref={sinoRef} className="relative">
          <button
            onClick={() => setSinoAberto(prev => !prev)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300 ${
              naoLidas > 0 
                ? 'text-amber-500 bg-amber-50 border border-amber-200 animate-pulse' 
                : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
            }`}
          >
            <Bell size={18} className={naoLidas > 0 ? 'fill-amber-500' : ''} />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none border-2 border-white">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </button>

          {sinoAberto && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 flex flex-col max-h-[480px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <span className="text-[#1E293B] font-semibold text-sm">Notificações</span>
                  {naoLidas > 0 && (
                    <span className="bg-[#EFF6FF] text-[#1A56DB] text-xs font-medium px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                      {naoLidas}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {naoLidas > 0 && (
                    <button onClick={marcarTodasComoLidas} className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1A56DB] hover:bg-[#EFF6FF] transition-colors">
                      <CheckCheck size={15} />
                    </button>
                  )}
                  {notificacoes.length > 0 && (
                    <button onClick={limparTodas} className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button onClick={() => setSinoAberto(false)} className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingNotif ? (
                  <div className="py-10 text-center text-[#64748B] text-sm">Carregando...</div>
                ) : notificacoes.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-[#64748B] text-sm">Nenhuma notificação</p>
                  </div>
                ) : (
                  notificacoes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.lida && marcarComoLida(n.id)}
                      className={`flex gap-3 px-4 py-3 border-b border-[#E2E8F0] last:border-0 transition-colors cursor-pointer ${n.lida ? 'opacity-50 hover:opacity-70' : 'hover:bg-[#F8FAFC]'}`}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{iconeTipo(n.tipo)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${n.lida ? 'text-[#64748B]' : 'text-[#1E293B]'}`}>{n.titulo}</p>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-snug line-clamp-2">{n.mensagem}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">{tempoRelativo(n.created_at)}</p>
                      </div>
                      {!n.lida && <span className="w-2 h-2 bg-[#1A56DB] rounded-full flex-shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
            <span className="text-[#1A56DB] text-sm font-bold">{inicial}</span>
          </div>
          <div className="text-right">
            <p className="text-[#1E293B] text-sm font-medium leading-none">{nome}</p>
            <p className="text-[#64748B] text-[10px] mt-0.5 uppercase font-bold tracking-wider">Colaborador</p>
          </div>
        </div>
      </div>
    </header>
  )
}
