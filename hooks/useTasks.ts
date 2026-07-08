'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'finalizada'
export type TaskPriority = 'baixa' | 'media' | 'alta'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  created_by: string
  assigned_to: string
  due_date: string | null
  created_at: string
  updated_at: string
  // Joins
  creator?: { name: string | null; email: string }
  assignee?: { name: string | null; email: string }
}

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(name, email),
          assignee:profiles!tasks_assigned_to_fkey(name, email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setTasks(data || [])
    } catch (err: any) {
      console.error('Erro ao buscar tarefas:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (task: Partial<Task>) => {
    if (!user) {
      console.error('createTask: Usuário não autenticado')
      return
    }
    
    // Garantir que campos obrigatórios não sejam nulos/vazios
    if (!task.title) {
      throw new Error('O título da tarefa é obrigatório')
    }

    try {
      const taskData = {
        title: task.title,
        description: task.description || null,
        status: task.status || 'a_fazer',
        priority: task.priority || 'media',
        created_by: user.id,
        assigned_to: task.assigned_to || user.id,
        due_date: task.due_date || null
      }

      console.log('Enviando tarefa para o Supabase:', taskData)

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (insertError) {
        console.error('Erro retornado pelo Supabase:', insertError)
        throw insertError
      }
      
      await fetchTasks()
      return data
    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err)
      throw err
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
      await fetchTasks()
    } catch (err: any) {
      console.error('Erro ao atualizar tarefa:', err)
      throw err
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchTasks()
    } catch (err: any) {
      console.error('Erro ao excluir tarefa:', err)
      throw err
    }
  }

  return {
    tasks,
    loading,
    error,
    refresh: fetchTasks,
    createTask,
    updateTask,
    deleteTask
  }
}
