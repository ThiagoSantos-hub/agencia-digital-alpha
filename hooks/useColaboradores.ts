'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Colaborador {
  id: string
  name: string
  role: string
  email: string | null
  phone: string | null
  status: 'ativo' | 'inativo'
  salary: number | null
  salary_frequency: 'mensal' | 'quinzenal' | 'semanal' | null
  salary_day: number | null
  created_at: string
  updated_at: string
}

export interface ColaboradorInput {
  name: string
  role: string
  email?: string
  phone?: string
  status?: 'ativo' | 'inativo'
  salary?: number
  salary_frequency?: 'mensal' | 'quinzenal' | 'semanal'
  salary_day?: number
}

export function useColaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchColaboradores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setColaboradores(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar colaboradores')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createColaborador = async (input: ColaboradorInput) => {
    const { data, error } = await supabase
      .from('collaborators')
      .insert([{ ...input, status: input.status ?? 'ativo' }])
      .select()
      .single()
    if (error) throw error
    await fetchColaboradores()
    return data
  }

  const updateColaborador = async (id: string, input: Partial<ColaboradorInput>) => {
    const { data, error } = await supabase
      .from('collaborators')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await fetchColaboradores()
    return data
  }

  const deleteColaborador = async (id: string) => {
    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchColaboradores()
  }

  const toggleStatus = async (id: string, currentStatus: 'ativo' | 'inativo') => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'
    await updateColaborador(id, { status: newStatus })
  }

  useEffect(() => {
    fetchColaboradores()
  }, [fetchColaboradores])

  return {
    colaboradores,
    loading,
    error,
    fetchColaboradores,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    toggleStatus,
  }
}
