'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'finalizada' | 'pendente' | 'concluida' | 'cancelada'
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  collaborator_id: string | null
  assignee_id: string | null
  client_id: string | null
  campaign_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  collaborator_id?: string
  priority?: TaskPriority
  due_date?: string
  status?: TaskStatus
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const listTasks = useCallback(async (filters?: { collaboratorId?: string; status?: TaskStatus }) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.collaboratorId) {
        query = query.eq('collaborator_id', filters.collaboratorId)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (error) throw error
      setTasks(data || [])
      return data || []
    } catch (err: any) {
      console.error('Erro ao listar tarefas:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createTask = async (input: CreateTaskInput) => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const taskData: any = {
        title: input.title,
        status: input.status || 'a_fazer',
        priority: input.priority || 'media',
        description: input.description?.trim() || null,
        collaborator_id: input.collaborator_id || null,
        owner_id: session?.user?.id || null,
        created_by: session?.user?.id || null
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()

      if (error) {
        console.error('Erro ao criar tarefa:', error)
        throw error
      }
      
      await listTasks()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await listTasks()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      await listTasks()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    tasks,
    loading,
    error,
    listTasks,
    createTask,
    updateTask,
    deleteTask
  }
}
