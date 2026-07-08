'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './useAuth'

export type TaskStatus = 'pendente' | 'a_fazer' | 'em_andamento' | 'finalizada'
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  created_by: string
  assigned_to: string
  due_date: string | null
  drive_link: string | null
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
      // Disparar o escalonamento automático em background (não bloqueia a busca)
      supabase.rpc('auto_escalate_task_priority').catch(() => {
        console.warn('RPC auto_escalate_task_priority falhou')
      })

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

    // Realtime: Atualiza o quadro Kanban instantaneamente
    const channel = supabase
      .channel('tasks_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('Mudança detectada nas tarefas:', payload)
          fetchTasks() // Recarrega para garantir que os Joins (creator/assignee) venham corretos
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks, supabase])

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
        due_date: task.due_date || null,
        drive_link: task.drive_link || null
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
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Erro retornado pelo Supabase na exclusão:', deleteError)
        alert(`Erro ao excluir: ${deleteError.message}`)
        throw deleteError
      }
      
      await fetchTasks()
    } catch (err: any) {
      console.error('Erro ao excluir tarefa:', err)
      alert('Não foi possível excluir a tarefa. Verifique as permissões no Supabase.')
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
