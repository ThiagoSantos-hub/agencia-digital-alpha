'use client'
import { useEffect } from 'react'
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
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (profile?.role === 'collaborator') {
        router.push('/colaborador/dashboard')
      }
    }
  }, [user, profile, loading, router])
  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Carregando Alpha...</div>
      </div>
    )
  }

  // Se é collaborator, não renderiza nada — o useEffect já redireciona
  if (profile?.role === 'collaborator') {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Redirecionando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0c] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <NotificationSound />
      <AlphaWidget />
      <AlphaVoiceButton />
    </div>
  )
}
