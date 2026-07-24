'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, BarChart2, Bell,
  CheckSquare, List, Wallet, UserCog, Bot, Plug,
  Sparkles, MessageSquare, UserCircle, LogOut, Settings,
  FileSignature, Building2, CreditCard, Rocket, CalendarClock, Lock, Layers, Video, TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { usePlanFeatures } from '@/hooks/usePlanFeatures'
import { springSoft } from '@/lib/motion'
import { VoiceAssistantWidget } from '@/components/VoiceAssistantWidget'
import { SupportChatWidget } from '@/components/support/SupportChatWidget'

const menuGroups = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Novidades',  href: '/novidades', icon: Sparkles,      ativo: true },
      { label: 'Próximas Atualizações', href: '/atualizacoes', icon: Rocket, ativo: true },
      { label: 'Feedbacks',  href: '/feedbacks', icon: MessageSquare, ativo: true },
    ],
  },
  {
    label: 'CLIENTES & CAMPANHAS',
    items: [
      { label: 'Clientes',   href: '/clientes',   icon: Users,      ativo: true, featureKey: 'modulo.clientes' },
      { label: 'Acompanhamento', href: '/acompanhamento', icon: TrendingUp, ativo: true, featureKey: 'modulo.acompanhamento' },
      { label: 'Campanhas',  href: '/campanhas',  icon: Megaphone,  ativo: true, featureKey: 'modulo.campanhas' },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart2,  ativo: true, featureKey: 'modulo.relatorios' },
      { label: 'Alertas',    href: '/alertas',    icon: Bell,       ativo: true, featureKey: 'modulo.alertas' },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { label: 'Agenda',        href: '/agenda',        icon: CalendarClock, ativo: true, featureKey: 'modulo.agenda' },
      { label: 'Tarefas',       href: '/tarefas',       icon: CheckSquare,   ativo: true, featureKey: 'modulo.tarefas' },
      { label: 'Checklists',    href: '/checklists',    icon: List,          ativo: true, featureKey: 'modulo.checklists' },
      { label: 'Contratos',     href: '/contratos',     icon: FileSignature, ativo: true, featureKey: 'modulo.contratos' },
      { label: 'Financeiro',    href: '/financeiro',    icon: Wallet,        ativo: true, featureKey: 'modulo.financeiro' },
      { label: 'Colaboradores', href: '/colaboradores', icon: UserCog,       ativo: true, featureKey: 'modulo.colaboradores' },
    ],
  },
  {
    label: 'FERRAMENTAS',
    items: [
      { label: 'Alpha AI',    href: '/ai',          icon: Bot,  ativo: true, featureKey: 'modulo.ai' },
      { label: 'Integrações', href: '/integracoes', icon: Plug, ativo: true, featureKey: 'modulo.integracoes' },
    ],
  },
  {
    label: 'OUTROS',
    items: [
      { label: 'Assinatura',    href: '/assinatura',    icon: CreditCard, ativo: true },
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
  const { signOut, profile } = useAuth()
  const { isLocked, planName } = usePlanFeatures()
  const [lockedLabel, setLockedLabel] = useState<string | null>(null)

  const groups = profile?.is_super_admin
    ? [...menuGroups, {
        label: 'PLATAFORMA',
        items: [
          { label: 'Empresas', href: '/superadmin/empresas', icon: Building2, ativo: true },
          { label: 'Pagamentos', href: '/superadmin/pagamentos', icon: CreditCard, ativo: true },
          { label: 'Planos', href: '/superadmin/planos', icon: Layers, ativo: true },
          { label: 'Tutoriais', href: '/superadmin/tutoriais', icon: Video, ativo: true },
        ],
      }]
    : menuGroups

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

        {groups.map((group) => (
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

                const locked = 'featureKey' in item && item.featureKey ? isLocked(item.featureKey) : false
                if (locked) return (
                  <button
                    key={item.href}
                    onClick={() => setLockedLabel(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-disabled hover:bg-hover-bg transition-colors"
                  >
                    <Icon size={18} />
                    <span className="text-sm font-semibold">{item.label}</span>
                    <Lock size={13} className="ml-auto" />
                  </button>
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

      <div className="px-3 py-4 border-t border-border flex items-center gap-2">
        <motion.button
          onClick={() => signOut()}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={springSoft}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="text-sm font-semibold truncate">Sair do sistema</span>
        </motion.button>
        <VoiceAssistantWidget />
        <SupportChatWidget />
      </div>

      {lockedLabel && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setLockedLabel(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-text-main mb-2">{lockedLabel} não está no seu plano</h2>
              <p className="text-sm text-text-muted mb-5">
                Essa funcionalidade não está incluída no seu plano atual{planName ? ` (${planName})` : ''}. Faça upgrade pra desbloquear.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setLockedLabel(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-text-main hover:bg-hover-bg transition-colors text-sm font-medium">Fechar</button>
                <Link href="/assinatura" onClick={() => setLockedLabel(null)} className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-medium text-center">Ver planos</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
