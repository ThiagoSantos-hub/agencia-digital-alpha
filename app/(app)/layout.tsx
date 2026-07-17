'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NotificationSound } from '@/components/layout/NotificationSound'
import { AlphaWidget } from '@/components/AlphaWidget'
import { AlphaVoiceButton } from '@/components/AlphaVoiceButton'
import { PageFade } from '@/components/ui/Motion'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (loading || didRedirect.current) return

    if (!user) {
      didRedirect.current = true
      router.replace('/login')
    } else if (!profile) {
      didRedirect.current = true
      router.replace('/login')
    } else if (profile.role === 'collaborator') {
      didRedirect.current = true
      router.replace('/colaborador/dashboard')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Verificando perfil...</p>
        </div>
      </div>
    )
  }

  if (profile.role === 'collaborator') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3"></div>
          <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden text-text-main">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <PageFade key={pathname}>
            {children}
          </PageFade>
        </main>
      </div>
      <NotificationSound />
      <AlphaWidget />
      <AlphaVoiceButton />
    </div>
  )
}
