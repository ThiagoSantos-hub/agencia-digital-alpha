'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type ColaboradorFinance = {
  id: string
  collaborator_id: string
  type: 'receita' | 'gasto'
  description: string
  amount: number
  date: string
  created_at: string
}

export function useColaboradorFinance() {
  const { user } = useAuth()
  const [finances, setFinances] = useState<ColaboradorFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const supabase = createClient()

  // Buscar ID do colaborador vinculado ao usuário
  const fetchCollaboratorId = useCallback(async () => {
    if (!user) return null

    const { data, error } = await supabase
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      console.error('Erro ao buscar ID do colaborador:', error)
      return null
    }

    setCollaboratorId(data.id)
    return data.id
  }, [user, supabase])

  // Listar todos os registros do colaborador
  const listFinance = useCallback(async () => {
    setLoading(true)
    try {
      let currentCollaboratorId = collaboratorId
      if (!currentCollaboratorId) {
        currentCollaboratorId = await fetchCollaboratorId()
      }

      if (!currentCollaboratorId) return

      const { data, error } = await supabase
        .from('collaborator_finance')
        .select('*')
        .eq('collaborator_id', currentCollaboratorId)
        .order('date', { ascending: false })

      if (error) throw error
      setFinances(data || [])
    } catch (error) {
      console.error('Erro ao listar financeiro:', error)
    } finally {
      setLoading(false)
    }
  }, [collaboratorId, fetchCollaboratorId, supabase])

  // Criar novo registro
  const createFinance = async ({
    type,
    description,
    amount,
    date,
  }: {
    type: 'receita' | 'gasto'
    description: string
    amount: number
    date: string
  }) => {
    try {
      let currentCollaboratorId = collaboratorId
      if (!currentCollaboratorId) {
        currentCollaboratorId = await fetchCollaboratorId()
      }

      if (!currentCollaboratorId) throw new Error('Colaborador não identificado')

      const { data, error } = await supabase
        .from('collaborator_finance')
        .insert([
          {
            collaborator_id: currentCollaboratorId,
            type,
            description,
            amount,
            date,
          },
        ])
        .select()

      if (error) throw error
      await listFinance()
      return { data, error: null }
    } catch (error: any) {
      console.error('Erro ao criar registro financeiro:', error)
      return { data: null, error: error.message }
    }
  }

  // Remover registro
  const deleteFinance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('collaborator_finance')
        .delete()
        .eq('id', id)

      if (error) throw error
      await listFinance()
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao deletar registro financeiro:', error)
      return { error: error.message }
    }
  }

  // Carregar dados inicialmente
  useEffect(() => {
    if (user) {
      listFinance()
    }
  }, [user, listFinance])

  // Cálculos de totais
  const totals = finances.reduce(
    (acc, item) => {
      if (item.type === 'receita') {
        acc.receitas += Number(item.amount)
      } else {
        acc.gastos += Number(item.amount)
      }
      return acc
    },
    { receitas: 0, gastos: 0 }
  )

  const saldo = totals.receitas - totals.gastos

  return {
    finances,
    loading,
    listFinance,
    createFinance,
    deleteFinance,
    totalReceitas: totals.receitas,
    totalGastos: totals.gastos,
    saldo,
  }
}
