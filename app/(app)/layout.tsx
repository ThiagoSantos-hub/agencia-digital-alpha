'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
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
  if (!user && loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }
  if (!user) return null
  return (
    <div className="min-h-screen bg-[#0a0f0c] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-400 text-sm">Carregando dados...</div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <AlphaWidget />
      <AlphaVoiceButton />
    </div>
  )
}
