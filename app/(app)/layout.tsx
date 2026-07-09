'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NotificationSound } from '@/components/layout/NotificationSound'
import { AlphaWidget } from '@/components/AlphaWidget'
import { AlphaVoiceButton } from '@/components/AlphaVoiceButton'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (loading || didRedirect.current) return

    if (!user) {
      didRedirect.current = true
      router.replace('/login')
    } else if (!profile) {
      // User existe mas profile não — redirecionar para login (profile não existe no banco)
      didRedirect.current = true
      router.replace('/login')
    } else if (profile.role === 'collaborator') {
      didRedirect.current = true
      router.replace('/colaborador/dashboard')
    }
  }, [user, profile, loading, router])

  // Loading — query ao Supabase ainda não retornou
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  // User não autenticado — não renderiza nada, o useEffect já redireciona
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  // User existe mas profile não existe — não renderiza nada, o useEffect redireciona
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Verificando perfil...</p>
        </div>
      </div>
    )
  }

  // Colaborador tentando acessar admin — redireciona
  if (profile.role === 'collaborator') {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Redirecionando para seu painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0c] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <NotificationSound />
      <AlphaWidget />
      <AlphaVoiceButton />
    </div>
  )
}
