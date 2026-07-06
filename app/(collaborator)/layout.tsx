'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users,
  CheckSquare, 
  Megaphone, 
  Wallet, 
  Plug, 
  UserCircle, 
  LogOut 
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const menuItems = [
  { label: 'Dashboard', href: '/colaborador/dashboard', icon: LayoutDashboard },
  { label: 'Tarefas', href: '/colaborador/tarefas', icon: CheckSquare },
  { label: 'Checklists', href: '/colaborador/checklists', icon: CheckSquare },
  { label: 'Meus Clientes', href: '/colaborador/meus-clientes', icon: Users },
  { label: 'Clientes Agência', href: '/colaborador/clientes', icon: Users },
  { label: 'Campanhas', href: '/colaborador/campanhas', icon: Megaphone },
  { label: 'Financeiro', href: '/colaborador/financeiro', icon: Wallet },
  { label: 'Integrações', href: '/colaborador/integracoes', icon: Plug },
  { label: 'Perfil', href: '/colaborador/perfil', icon: UserCircle },
]

export default function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'collaborator')) {
      router.replace('/login')
    }
  }, [profile, loading, router])

  if (loading || !profile || profile.role !== 'collaborator') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0f0c] border-r border-[#1a3a24] flex flex-col z-40">
        <div className="px-6 py-5 border-b border-[#1a3a24]">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg tracking-tight">DIGITAL</span>
            <span className="text-[#00ff88] font-black text-lg tracking-tight">ALPHA</span>
          </div>
          <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest mt-1">Painel Colaborador</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
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
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#1a3a24]">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-[#1a3a24] bg-[#0a0f0c]/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-400">Bem-vindo de volta,</h2>
            <p className="text-white font-bold">{profile.name || profile.email}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold uppercase">
              {profile.name?.[0] || profile.email?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
