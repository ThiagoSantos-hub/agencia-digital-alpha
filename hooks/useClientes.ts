'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  // Meta Ads
  meta_ad_account_id: string | null
  show_campaigns: boolean
  // Campos virtuais calculados
  dias_atraso?: number
}

type ClientInput = Omit<Client, 'id' | 'created_at' | 'dias_atraso'>

// Calcula quantos dias um payment_day está atrasado em relação a hoje.
// Ex: hoje é dia 4, payment_day = 1 → 3 dias atrasado.
function calcularDiasAtrasoPorPaymentDay(paymentDay: number): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const diaReal = Math.min(paymentDay, ultimoDia)
  const vencimento = new Date(ano, mes, diaReal)
  vencimento.setHours(0, 0, 0, 0)
  if (vencimento >= hoje) return 0
  return Math.ceil((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
}

export function useClientes() {
  const [clients, setClients] = useState<Client[]>([])
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchClients = useCallback(async (forceRefetch = false) => {
    if (!forceRefetch && Date.now() - lastFetchTime.current < CACHE_DURATION && clients.length > 0) {
      return // Usar cache se recente
    }
    if (clients.length === 0) setLoading(true)
    
    try {
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
        if (client.status === 'inativo') return client

        const clientFinances = (financesData ?? []).filter(f => f.client_id === client.id)
        
        let maiorAtraso = 0
        let temAtrasado = false

        clientFinances.forEach(f => {
          const vencimento = new Date(f.data_vencimento)
          vencimento.setHours(0, 0, 0, 0)
          
          if (vencimento < hoje || f.status === 'atrasado') {
            temAtrasado = true
            const diffDays = Math.ceil(
              (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (diffDays > maiorAtraso) maiorAtraso = diffDays
          }
        })

        // CORREÇÃO: cliente marcado como 'atrasado' no banco mas sem lançamentos
        // → calcular dias com base no payment_day diretamente
        if (!temAtrasado && client.status === 'atrasado' && client.payment_day) {
          maiorAtraso = calcularDiasAtrasoPorPaymentDay(client.payment_day)
          temAtrasado = true
        }

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
      lastFetchTime.current = Date.now()
    }
  }, [supabase, clients.length])

  useEffect(() => {
    fetchClients(true)

    const channel = supabase
      .channel('public:clients')
      .on('postgres_changes', { event: '*', table: 'clients', schema: 'public' }, () => {
        fetchClients(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchClients, supabase])

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
      const newClient: Client = {
        ...data,
        dias_atraso: 0
      }
      setClients(prev => [newClient, ...prev])

      if (data.monthly_fee && data.payment_day) {
        const hoje = new Date()
        const dataHoje = hoje.toISOString().split('T')[0]
        
        // 1. Registrar o pagamento de entrada (Hoje) como PAGO
        await supabase.from('finances').insert({
          user_id: data.manager_id,
          client_id: data.id,
          escopo: 'agencia',
          tipo: 'receita',
          categoria: 'Mensalidade de cliente',
          descricao: `Mensalidade (Entrada) - ${data.name}`,
          valor: data.monthly_fee,
          dia_vencimento: hoje.getDate(), // dia de hoje pois pagou agora
          data_vencimento: dataHoje,
          data_pagamento: dataHoje,
          status: 'pago',
          recorrente: false // entrada não é a recorrência em si
        })

        // 2. Agendar o próximo vencimento para o mês seguinte no dia escolhido
        const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, data.payment_day)
        const dataProximoVencimento = proximoMes.toISOString().split('T')[0]

        await supabase.from('finances').insert({
          user_id: data.manager_id,
          client_id: data.id,
          escopo: 'agencia',
          tipo: 'receita',
          categoria: 'Mensalidade de cliente',
          descricao: `Mensalidade - ${data.name}`,
          valor: data.monthly_fee,
          dia_vencimento: data.payment_day,
          data_vencimento: dataProximoVencimento,
          status: 'pendente',
          recorrente: true,
          recorrencia: 'mensal'
        })
      }
    }
    return { data, error }
  }

  const updateCliente = async (id: string, input: Partial<ClientInput>) => {
    const payload = { ...input }
    
    const clienteAtual = clients.find(c => c.id === id)
    const estaReativando = clienteAtual?.status === 'inativo' && (payload.status === 'ativo' || payload.status === 'atrasado')
    const estaMarcandoComoPago = (clienteAtual?.status === 'atrasado' || clienteAtual?.status === 'inativo') && payload.status === 'ativo'

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
      // Atualização local imediata para feedback visual
      setClients(prev => 
        prev.map(c => c.id === id ? { ...data, dias_atraso: payload.status === 'ativo' ? 0 : c.dias_atraso } : c)
      )

      // Se marcou como ativo (pagou), atualizar o financeiro
      if (estaMarcandoComoPago) {
        const hoje = new Date()
        const mesAtual = hoje.getMonth() + 1
        const anoAtual = hoje.getFullYear()
        
        // Buscar lançamento pendente ou atrasado deste mês para este cliente
        const { data: financeiro } = await supabase
          .from('finances')
          .select('id, data_vencimento')
          .eq('client_id', id)
          .eq('status', 'pendente')
          .order('data_vencimento', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (financeiro) {
          // Marcar o lançamento como pago
          await supabase
            .from('finances')
            .update({ 
              status: 'pago', 
              data_pagamento: hoje.toISOString().split('T')[0] 
            })
            .eq('id', financeiro.id)
        }
      }

      if (payload.status === 'inativo') {
        await supabase
          .from('finances')
          .delete()
          .eq('client_id', id)
          .eq('status', 'pendente')
      }

      if (estaReativando && data.monthly_fee && data.payment_day) {
        const hoje = new Date()
        const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), data.payment_day).toISOString().split('T')[0]
        
        const { data: existente } = await supabase
          .from('finances')
          .select('id')
          .eq('client_id', id)
          .eq('data_vencimento', dataVencimento)
          .maybeSingle()

        if (!existente) {
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
      }

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
    }
    return { data, error }
  }

  const deleteCliente = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== id))
      await supabase
        .from('finances')
        .delete()
        .eq('client_id', id)
    }
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
