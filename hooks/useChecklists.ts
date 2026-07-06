'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface ChecklistItem {
  id: string
  checklist_id: string
  user_id: string
  text: string
  completed: boolean
  created_at: string
}

export interface Checklist {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  checklist_items?: ChecklistItem[]
}

export function useChecklists() {
  const { user } = useAuth()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchChecklists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*, checklist_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setChecklists(data || [])
    } catch (err) {
      console.error('Erro ao buscar checklists:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchChecklists()
  }, [fetchChecklists])

  const createChecklist = async (title: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('checklists')
        .insert({ title, user_id: user.id })
      
      if (error) {
        console.error('Erro ao criar checklist no Supabase:', error)
        throw error
      }
      
      await fetchChecklists()
    } catch (err) {
      console.error('Erro na função createChecklist:', err)
    }
  }

  const deleteChecklist = async (id: string) => {
    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id)
    if (!error) await fetchChecklists()
  }

  const addItem = async (checklist_id: string, text: string) => {
    if (!user) return
    const { error } = await supabase
      .from('checklist_items')
      .insert({ checklist_id, text, user_id: user.id, completed: false })
    if (!error) await fetchChecklists()
  }

  const toggleItem = async (item_id: string, completed: boolean) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ completed: !completed })
      .eq('id', item_id)
    if (!error) await fetchChecklists()
  }

  const deleteItem = async (item_id: string) => {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', item_id)
    if (!error) await fetchChecklists()
  }

  const uncheckAll = async (checklist_id: string) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ completed: false })
      .eq('checklist_id', checklist_id)
    if (!error) await fetchChecklists()
  }

  return {
    checklists,
    loading,
    fetchChecklists,
    createChecklist,
    deleteChecklist,
    addItem,
    toggleItem,
    deleteItem,
    uncheckAll,
  }
}
