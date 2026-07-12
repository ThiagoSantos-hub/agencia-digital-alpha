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
      case 'task': return <CheckCircle2 size={16} className="text-[#1A56DB]" />
      case 'alert': return <Clock size={16} className="text-amber-500" />
      default: return <Info size={16} className="text-blue-500" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#64748B] hover:text-[#1E293B] transition-colors bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] hover:border-[#1A56DB]/30 shadow-sm"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <h3 className="text-[#1E293B] font-bold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-black uppercase tracking-widest text-[#1A56DB] hover:underline"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-[#CBD5E1] mb-2" />
                <p className="text-[#64748B] text-xs">Nenhuma notificação por aqui.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b border-[#F1F5F9] hover:bg-[#F1F5F9] transition-colors relative group ${!n.read ? 'bg-[#1A56DB]/5' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold mb-0.5 ${!n.read ? 'text-[#1E293B]' : 'text-[#64748B]'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[9px] text-[#94A3B8] mt-2 font-medium">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')} às {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="w-2 h-2 bg-[#1A56DB] rounded-full mt-1.5"
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

          <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:text-[#1E293B] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
