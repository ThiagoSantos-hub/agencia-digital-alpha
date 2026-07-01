'use client'

import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Header() {
  const { profile, role, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'
  const nome = profile?.name ?? profile?.email ?? 'Usuário'
  const inicial = nome.charAt(0).toUpperCase()

  return (
    <header className="h-16 bg-[#0a0f0c] border-b border-[#1a3a24] flex items-center justify-between px-6">

      {/* Título da página */}
      <div>
        <h2 className="text-white font-semibold text-sm">Painel de Controle</h2>
        <p className="text-gray-500 text-xs">Agência Digital Alpha</p>
      </div>

      {/* Usuário */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/40 flex items-center justify-center">
            <span className="text-[#00ff88] text-sm font-bold">{inicial}</span>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-medium leading-none">{nome}</p>
            <p className="text-gray-500 text-xs mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a3a24]/40 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
