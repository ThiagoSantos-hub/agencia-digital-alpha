'use client'

import { useAuth } from '@/hooks/useAuth'
import { LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Header() {
  const { profile, role, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'

  return (
    <header className="h-16 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between px-6">

      {/* Título da página */}
      <div>
        <h2 className="text-white font-semibold text-sm">Painel de Controle</h2>
        <p className="text-gray-500 text-xs">Agência Digital Alpha</p>
      </div>

      {/* Usuário */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
            <User size={14} className="text-indigo-400" />
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium leading-none">
              {profile?.name ?? profile?.email ?? 'Usuário'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
