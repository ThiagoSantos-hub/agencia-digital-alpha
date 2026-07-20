'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'manager' | 'collaborator'
  company_id: string
  is_super_admin: boolean
}

// Cache global simples para o perfil durante a sessão
let cachedProfile: Profile | null = null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchingProfileFor = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileFor.current === userId || cachedProfile?.id === userId) return
    fetchingProfileFor.current = userId

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[useAuth] Erro ao buscar perfil:', error.message)
      }

      if (data) {
        cachedProfile = data
        setProfile(data)
      }
    } catch (err: any) {
      console.error('[useAuth] Erro ao buscar perfil:', err?.message ?? err)
    } finally {
      fetchingProfileFor.current = null
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      // Timeout de 10s para evitar travamento
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 10000)
      )
      const sessionPromise = supabase.auth.getSession()
      const raceResult = await Promise.race([
        sessionPromise.then(r => ({ result: r, timeout: false })),
        timeoutPromise.then(r => ({ result: r, timeout: true }))
      ]) as any

      const session = raceResult.timeout ? null : raceResult.result?.data?.session ?? null
      const initialUser = session?.user ?? null
      setUser(initialUser)

      if (initialUser) {
        if (cachedProfile?.id === initialUser.id) {
          setLoading(false)
        } else {
          await fetchProfile(initialUser.id)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)

        if (newUser) {
          if (cachedProfile?.id !== newUser.id) {
            await fetchProfile(newUser.id)
          }
        } else {
          cachedProfile = null
          setProfile(null)
          fetchingProfileFor.current = null
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error }
  }

  const signOut = async () => {
    cachedProfile = null
    setProfile(null)
    await supabase.auth.signOut()
  }

  const role = profile?.role ?? null

  return { user, profile, role, loading, signIn, signInWithGoogle, signOut }
}
