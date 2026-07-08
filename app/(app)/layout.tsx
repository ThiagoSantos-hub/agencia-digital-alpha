'use client'
import { useEffect, useCallback, useRef, useState } from 'react'
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
  const redirectDoneRef = useRef(false)

  const handleRedirect = useCallback((path: string) => {
    if (!redirectDoneRef.current) {
      redirectDoneRef.current = true
      router.replace(path)
    }
  }, [router])

  // Estado local para forçar re-render após redirect detection
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Detectar redirect no render síncrono — ANTES de qualquer children renderizar
  if (isRedirecting || (!loading && profile?.role === 'collaborator')) {
    if (!loading && profile?.role === 'collaborator' && !isRedirecting) {
      setIsRedirecting(true)
      handleRedirect('/colaborador/dashboard')
    }
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Redirecionando...</div>
      </div>
    )
  }

  // Loading: aguardar profile antes de renderizar qualquer layout
  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Carregando Alpha...</div>
      </div>
    )
  }

  // Fallback com useEffect (para casos de profile update)
  useEffect(() => {
    if (!loading && !user) {
      handleRedirect('/login')
    }
  }, [user, profile, loading, handleRedirect])

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
