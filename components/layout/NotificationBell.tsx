'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCircle2, Clock, Info, X } from 'lucide-react'
import { useNotifications, Notification } from '@/hooks/useNotifications'
import Link from 'next/link'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckCircle2 size={16} className="text-[#00ff88]" />
      case 'alert': return <Clock size={16} className="text-amber-500" />
      default: return <Info size={16} className="text-blue-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors bg-[#1a3a24]/20 rounded-xl border border-[#1a3a24] hover:border-[#00ff88]/30"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-[#0a0f0c]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-4 py-3 border-b border-[#1a3a24] flex items-center justify-between bg-[#0f1a14]">
            <h3 className="text-white font-bold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-black uppercase tracking-widest text-[#00ff88] hover:underline"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-gray-800 mb-2" />
                <p className="text-gray-500 text-xs">Nenhuma notificação por aqui.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b border-[#1a3a24]/50 hover:bg-[#1a3a24]/10 transition-colors relative group ${!n.read ? 'bg-[#00ff88]/5' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold mb-0.5 ${!n.read ? 'text-white' : 'text-gray-400'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[9px] text-gray-600 mt-2 font-medium">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')} às {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="w-2 h-2 bg-[#00ff88] rounded-full mt-1.5"
                        title="Marcar como lida"
                      />
                    )}
                  </div>
                  {n.link && (
                    <Link 
                      href={n.link} 
                      onClick={() => {
                        markAsRead(n.id)
                        setIsOpen(false)
                      }}
                      className="absolute inset-0 z-0"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-[#1a3a24] bg-[#0f1a14]">
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
