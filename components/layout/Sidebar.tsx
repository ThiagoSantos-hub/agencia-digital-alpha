'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, BarChart2, Bell,
  CheckSquare, List, Wallet, UserCog, Bot, Plug,
  Sparkles, MessageSquare, UserCircle, LogOut, Settings
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { springSoft } from '@/lib/motion'

const menuGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Novidades',  href: '/novidades', icon: Sparkles,      ativo: true },
      { label: 'Feedbacks',  href: '/feedbacks', icon: MessageSquare, ativo: true },
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
      { label: 'Configurações', href: '/configuracoes', icon: Settings,   ativo: true },
      { label: 'Perfil',        href: '/perfil',        icon: UserCircle, ativo: true },
    ],
  },
]

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
        transition={springSoft}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
          active
            ? 'bg-active-bg text-primary border border-active-border shadow-sm'
            : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
        }`}
      >
        {children}
      </motion.div>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col shadow-md z-40">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-text-main font-black text-lg tracking-tight">DIGITAL</span>
          <span className="text-primary font-black text-lg tracking-tight">ALPHA</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4 custom-scrollbar">
        <div className="mb-2">
          <NavLink
            href="/dashboard"
            active={pathname === '/dashboard' || pathname.startsWith('/dashboard/')}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm font-semibold">Dashboard</span>
          </NavLink>
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
                if (!item.ativo) return (
                  <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-disabled cursor-not-allowed opacity-50">
                    <Icon size={18} />
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="ml-auto text-[9px] bg-hover-bg text-text-disabled px-1.5 py-0.5 rounded-md font-bold uppercase">Em breve</span>
                  </div>
                )
                return (
                  <NavLink key={item.href} href={item.href} active={isActive}>
                    <Icon size={18} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </NavLink>
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
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span className="text-sm font-semibold">Sair do sistema</span>
        </motion.button>
      </div>
    </aside>
  )
}
