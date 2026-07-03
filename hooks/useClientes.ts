'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: 'ativo' | 'inativo' | 'prospecto'
  monthly_fee: number | null
  start_date: string | null
  payment_day: number | null
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
    
    if (!error && data) {
      // [AUTOMAÇÃO] Criar lançamento financeiro automático se tiver mensalidade
      if (data.monthly_fee && data.payment_day) {
        const hoje = new Date()
        const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), data.payment_day).toISOString().split('T')[0]
        
        await supabase.from('finances').insert({
          user_id: data.manager_id,
          client_id: data.id,
          escopo: 'agencia',
          tipo: 'receita',
          categoria: 'Mensalidade de cliente',
          descricao: `Mensalidade - ${data.name}`,
          valor: data.monthly_fee,
          dia_vencimento: data.payment_day,
          data_vencimento: dataVencimento,
          status: 'pendente',
          recorrente: true,
          recorrencia: 'mensal'
        })
      }
      await fetchClients()
    }
    return { data, error }
  }

  const updateCliente = async (id: string, input: Partial<ClientInput>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      // [AUTOMAÇÃO] Sincronizar financeiro se mensalidade ou dia mudou
      if (input.monthly_fee !== undefined || input.payment_day !== undefined) {
        // Atualiza apenas lançamentos PENDENTES recorrentes deste cliente
        await supabase.from('finances')
          .update({
            valor: data.monthly_fee,
            dia_vencimento: data.payment_day,
            descricao: `Mensalidade - ${data.name}`
          })
          .eq('client_id', id)
          .eq('status', 'pendente')
          .eq('recorrente', true)
      }
      await fetchClients()
    }
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
