'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'finalizada'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  collaborator_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  collaborator_id?: string
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const listTasks = useCallback(async (collaboratorId?: string) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (collaboratorId) {
        query = query.eq('collaborator_id', collaboratorId)
      }

      const { data, error } = await query
      if (error) throw error
      setTasks(data || [])
      return data || []
    } catch (err: any) {
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
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...input,
          status: 'a_fazer',
          created_by: user?.id
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
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
    updateTaskStatus,
    deleteTask
  }
}
