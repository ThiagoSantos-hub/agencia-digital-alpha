'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'manager'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Evita buscar o perfil mais de uma vez para o mesmo user id
  const fetchingProfileFor = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileFor.current === userId) return
    fetchingProfileFor.current = userId

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    fetchingProfileFor.current = null
  }

  useEffect(() => {
    // Usa getSession (cache local) em vez de getUser (round-trip ao servidor)
    // getSession é suficiente para obter o user no client-side
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // onAuthStateChange cuida de login/logout em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null
        setUser(newUser)

        if (newUser) {
          await fetchProfile(newUser.id)
        } else {
          setProfile(null)
          fetchingProfileFor.current = null
        }

        // Só tira o loading se ainda estiver true (evita piscar na troca de estado)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    setProfile(null)
    await supabase.auth.signOut()
  }

  const role = profile?.role ?? null

  return { user, profile, role, loading, signIn, signOut }
}
