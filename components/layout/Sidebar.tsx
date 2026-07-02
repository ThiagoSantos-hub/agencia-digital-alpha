'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CheckSquare,
} from 'lucide-react'

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    ativo: true,
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: Users,
    ativo: true,
  },
  {
    label: 'Campanhas',
    href: '/campanhas',
    icon: Megaphone,
    ativo: true,
  },
  {
    label: 'Tarefas',
    href: '/tarefas',
    icon: CheckSquare,
    ativo: false,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0f0c] border-r border-[#1a3a24] flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1a3a24]">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-lg tracking-tight">DIGITAL</span>
          <span className="text-[#00ff88] font-black text-lg tracking-tight">ALPHA</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          if (!item.ativo) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 cursor-not-allowed opacity-50"
                title="Em breve"
              >
                <Icon size={18} />
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-xs bg-[#1a3a24]/50 text-gray-500 px-1.5 py-0.5 rounded-md">
                  Em breve
                </span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/40'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-6 py-4 border-t border-[#1a3a24]">
        <p className="text-xs text-gray-600">v0.1.0 — MVP</p>
      </div>
    </aside>
  )
}
