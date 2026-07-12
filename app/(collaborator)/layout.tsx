'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CollaboratorSidebar } from '@/components/layout/CollaboratorSidebar'
import { CollaboratorHeader } from '@/components/layout/CollaboratorHeader'
import { NotificationSound } from '@/components/layout/NotificationSound'
import { AlphaWidget } from '@/components/AlphaWidget'
import { AlphaVoiceButton } from '@/components/AlphaVoiceButton'

export default function CollaboratorLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (loading || didRedirect.current) return

    if (!user) {
      didRedirect.current = true
      router.replace('/login')
    } else if (!profile) {
      didRedirect.current = true
      router.replace('/login')
    } else if (profile.role !== 'collaborator') {
      didRedirect.current = true
      router.replace('/dashboard')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#1A56DB] mx-auto mb-3"></div>
          <p className="text-[#64748B] text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'collaborator') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#1A56DB] mx-auto mb-3"></div>
          <p className="text-[#64748B] text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden">
      <CollaboratorSidebar />
      <div className="flex-1 flex flex-col ml-64 h-full">
        <CollaboratorHeader />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
      <NotificationSound />
      <AlphaWidget />
      <AlphaVoiceButton />
    </div>
  )
}
