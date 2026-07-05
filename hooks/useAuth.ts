'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'manager' | 'collaborator'
}

// Cache global simples para o perfil durante a sessão
let cachedProfile: Profile | null = null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(!cachedProfile)
  const supabase = useMemo(() => createClient(), [])

  const fetchingProfileFor = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileFor.current === userId || cachedProfile?.id === userId) return
    fetchingProfileFor.current = userId

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        cachedProfile = data
        setProfile(data)
      }
    } finally {
      fetchingProfileFor.current = null
    }
  }

  useEffect(() => {
    // 1. Tentar pegar sessão imediata (síncrono se já carregado pelo Supabase)
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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

  const signOut = async () => {
    cachedProfile = null
    setProfile(null)
    await supabase.auth.signOut()
  }

  const role = profile?.role ?? null

  return { user, profile, role, loading, signIn, signOut }
}
