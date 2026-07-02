'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export interface Profile {
  id: string
  name: string | null
  role: 'admin' | 'manager'
}

export interface Tarefa {
  id: string
  title: string
  description: string | null
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  priority: 'baixa' | 'media' | 'alta' | 'urgente'
  due_date: string | null
  assignee_id: string | null
  client_id: string | null
  campaign_id: string | null
  created_at: string
  client?: { id: string; name: string } | null
  assignee?: { id: string; name: string | null } | null
}

export interface TarefaInput {
  title: string
  description?: string | null
  status: Tarefa['status']
  priority: Tarefa['priority']
  due_date?: string | null
  assignee_id?: string | null
  client_id?: string | null
  campaign_id?: string | null
}

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchUsuarios = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role')
      .order('name', { ascending: true })
    setUsuarios(data || [])
  }

  const fetchTarefas = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, client:clients(id, name), assignee:profiles(id, name)`)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTarefas(data || [])
    setLoading(false)
  }

  const createTarefa = async (input: TarefaInput) => {
    const { error } = await supabase.from('tasks').insert([input])
    if (error) throw error
    await fetchTarefas()
  }

  const updateTarefa = async (id: string, input: Partial<TarefaInput>) => {
    const { error } = await supabase.from('tasks').update(input).eq('id', id)
    if (error) throw error
    await fetchTarefas()
  }

  const deleteTarefa = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    await fetchTarefas()
  }

  useEffect(() => {
    fetchTarefas()
    fetchUsuarios()
  }, [])

  return { tarefas, usuarios, loading, error, createTarefa, updateTarefa, deleteTarefa, refetch: fetchTarefas }
}
