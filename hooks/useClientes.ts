'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

export interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: 'ativo' | 'inativo' | 'atrasado'
  monthly_fee: number | null
  start_date: string | null
  payment_day: number | null
  manager_id: string | null
  inativo_em: string | null
  created_at: string
  // Campos virtuais calculados
  dias_atraso?: number
}

type ClientInput = Omit<Client, 'id' | 'created_at' | 'dias_atraso'>

export function useClientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchClients = useCallback(async () => {
    // Não resetamos o loading se já temos dados, para evitar o "pisca" e lentidão visual
    if (clients.length === 0) setLoading(true)
    
    try {
      // 1. Buscar clientes e finanças em paralelo para ganhar tempo
      const [clientsRes, financesRes] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('finances')
          .select('client_id, data_vencimento, status')
          .eq('tipo', 'receita')
          .in('status', ['pendente', 'atrasado'])
      ])

      if (clientsRes.error) throw clientsRes.error
      if (financesRes.error) throw financesRes.error

      const clientsData = clientsRes.data
      const financesData = financesRes.data

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const processedClients = (clientsData ?? []).map((client: any) => {
        // Se o cliente já está inativo, mantém inativo
        if (client.status === 'inativo') return client

        // Encontrar lançamentos deste cliente
        const clientFinances = (financesData ?? []).filter(f => f.client_id === client.id)
        
        let maiorAtraso = 0
        let temAtrasado = false

        clientFinances.forEach(f => {
          const vencimento = new Date(f.data_vencimento)
          vencimento.setHours(0, 0, 0, 0)
          
          // Lógica corrigida: se a data de vencimento passou E não está pago, está atrasado
          if (vencimento < hoje || f.status === 'atrasado') {
            temAtrasado = true
            const diffTime = Math.abs(hoje.getTime() - vencimento.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays > maiorAtraso) maiorAtraso = diffDays
          }
        })

        // Prioridade para o status 'atrasado' se houver pendência financeira
        return {
          ...client,
          status: temAtrasado ? 'atrasado' : client.status,
          dias_atraso: temAtrasado ? maiorAtraso : 0
        }
      })

      setClients(processedClients)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, clients.length])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createCliente = async (input: ClientInput) => {
    const payload = { ...input }
    if (payload.status === 'inativo' && !payload.inativo_em) {
      payload.inativo_em = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single()
    
    if (!error && data) {
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
    const payload = { ...input }
    
    if (payload.status === 'inativo') {
      payload.inativo_em = new Date().toISOString()
    } else if (payload.status === 'ativo' || payload.status === 'atrasado') {
      payload.inativo_em = null
    }

    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      if (input.monthly_fee !== undefined || input.payment_day !== undefined) {
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
