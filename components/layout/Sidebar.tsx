'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, BarChart2, Bell,
  CheckSquare, List, Wallet, UserCog, Bot, Plug,
  Sparkles, MessageSquare, UserCircle, LogOut
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'

const menuGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, ativo: true },
    ],
  },
  {
    label: 'CLIENTES & CAMPANHAS',
    items: [
      { label: 'Clientes',   href: '/clientes',   icon: Users,      ativo: true },
      { label: 'Campanhas',  href: '/campanhas',  icon: Megaphone,  ativo: true },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart2,  ativo: true },
      { label: 'Alertas',    href: '/alertas',    icon: Bell,       ativo: true },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { label: 'Tarefas',       href: '/tarefas',       icon: CheckSquare, ativo: true },
      { label: 'Checklists',    href: '/checklists',    icon: List,        ativo: true },
      { label: 'Financeiro',    href: '/financeiro',    icon: Wallet,      ativo: true },
      { label: 'Colaboradores', href: '/colaboradores', icon: UserCog,     ativo: true },
    ],
  },
  {
    label: 'FERRAMENTAS',
    items: [
      { label: 'Alpha AI',    href: '/ai',          icon: Bot,  ativo: true },
      { label: 'Integrações', href: '/integracoes', icon: Plug, ativo: true },
    ],
  },
  {
    label: 'OUTROS',
    items: [
      { label: 'Novidades', href: '/novidades', icon: Sparkles,     ativo: false },
      { label: 'Feedbacks', href: '/feedbacks', icon: MessageSquare,ativo: false },
      { label: 'Perfil',    href: '/perfil',    icon: UserCircle,   ativo: true  },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0f0c] border-r border-[#1a3a24] flex flex-col">
      <div className="px-6 py-5 border-b border-[#1a3a24]">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-lg tracking-tight">DIGITAL</span>
          <span className="text-[#00ff88] font-black text-lg tracking-tight">ALPHA</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                if (!item.ativo) return (
                  <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 cursor-not-allowed opacity-50">
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-xs bg-[#1a3a24]/50 text-gray-500 px-1.5 py-0.5 rounded-md">Em breve</span>
                  </div>
                )
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/40'
                    }`}>
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#1a3a24]">
        <button onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-medium">Sair do sistema</span>
        </button>
      </div>
    </aside>
  )
}
