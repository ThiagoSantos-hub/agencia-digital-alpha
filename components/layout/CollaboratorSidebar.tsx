'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, BarChart2, Bell,
  CheckSquare, List, Wallet, Plug,
  Sparkles, MessageSquare, UserCircle, LogOut, UsersRound
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const menuGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Novidades',  href: '/colaborador/novidades', icon: Sparkles,      ativo: true },
      { label: 'Feedbacks',  href: '/colaborador/feedbacks', icon: MessageSquare, ativo: true },
    ],
  },
  {
    label: 'CLIENTES & CAMPANHAS',
    items: [
      { label: 'Meus Clientes',    href: '/colaborador/meus-clientes',    icon: Users,      ativo: true },
      { label: 'Clientes Agência', href: '/colaborador/clientes',         icon: UsersRound, ativo: true },
      { label: 'Campanhas',        href: '/colaborador/campanhas',        icon: Megaphone,  ativo: true },
      { label: 'Relatórios',       href: '/colaborador/relatorios',       icon: BarChart2,  ativo: true },
      { label: 'Alertas',          href: '/colaborador/alertas',          icon: Bell,       ativo: true },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { label: 'Tarefas',       href: '/colaborador/tarefas',       icon: CheckSquare, ativo: true },
      { label: 'Checklists',    href: '/colaborador/checklists',    icon: List,        ativo: true },
      { label: 'Financeiro',    href: '/colaborador/financeiro',    icon: Wallet,      ativo: true },
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
      { label: 'Perfil',    href: '/colaborador/perfil',    icon: UserCircle,   ativo: true  },
    ],
  },
]

export function CollaboratorSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E2E8F0] flex flex-col z-40">
      <div className="px-6 py-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="text-[#1E293B] font-black text-lg tracking-tight">DIGITAL</span>
          <span className="text-[#1A56DB] font-black text-lg tracking-tight">ALPHA</span>
        </div>
        <p className="text-[10px] text-[#1A56DB] font-bold uppercase tracking-widest mt-1">Painel Colaborador</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4 custom-scrollbar">
        {/* Dashboard isolado no topo */}
        <div className="mb-2">
          <Link href="/colaborador/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/colaborador/dashboard' || pathname.startsWith('/colaborador/dashboard/')
                ? 'bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]'
                : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
            }`}>
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
        </div>

        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                if (!item.ativo) return (
                  <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#94A3B8] cursor-not-allowed opacity-50">
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Em breve</span>
                  </div>
                )
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]'
                        : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
                    }`}>
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#E2E8F0]">
        <button onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-medium">Sair do sistema</span>
        </button>
      </div>
    </aside>
  )
}
