'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'ativo' | 'inativo' | 'prospecto'
  manager_id: string | null
  created_at: string
}

type ClientInput = Omit<Client, 'id' | 'created_at'>

export function useClientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setClients(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createCliente = async (input: ClientInput) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(input)
      .select()
      .single()

    if (!error) await fetchClients()
    return { data, error }
  }

  const updateCliente = async (id: string, input: Partial<ClientInput>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (!error) await fetchClients()
    return { data, error }
  }

  const deleteCliente = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) await fetchClients()
    return { error }
  }

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    createCliente,
    updateCliente,
    deleteCliente,
  }
}
