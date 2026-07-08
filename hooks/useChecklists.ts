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
  position: number
  created_at: string
}

export interface Checklist {
  id: string
  user_id: string
  title: string
  recurrence: 'once' | 'daily' | 'weekly'
  recurrence_days: number[] // 0-6
  status: 'pending' | 'completed'
  position: number
  last_reset_at: string
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
      // Chamar a função de reset em background (não bloqueia a busca)
      Promise.resolve(supabase.rpc('reset_recurring_checklists_by_day')).catch(rpcErr => {
        console.warn('Função RPC de reset ainda não existe ou falhou:', rpcErr)
      })

      const { data, error } = await supabase
        .from('checklists')
        .select('*, checklist_items(*)')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
      if (error) throw error
      
      // Ordenar itens por posição dentro de cada checklist
      const dataWithSortedItems = data?.map(list => ({
        ...list,
        checklist_items: list.checklist_items?.sort((a: any, b: any) => 
          (a.position || 0) - (b.position || 0)
        )
      }))

      setChecklists(dataWithSortedItems || [])
    } catch (err) {
      console.error('Erro ao buscar checklists:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchChecklists()
  }, [fetchChecklists])

  const createChecklist = async (title: string, recurrence: string = 'once', recurrence_days: number[] = []) => {
    if (!user) return
    
    // Pegar a última posição para colocar o novo checklist no final
    const maxPos = checklists.length > 0 ? Math.max(...checklists.map(l => l.position || 0)) : -1
    
    const { data, error } = await supabase
      .from('checklists')
      .insert({ 
        title, 
        user_id: user.id, 
        recurrence, 
        recurrence_days,
        position: maxPos + 1 
      })
      .select()
      .single()
    
    if (!error) {
      await fetchChecklists()
      return data
    }
    return null
  }

  const updateChecklist = async (id: string, updates: Partial<Checklist>) => {
    const { error } = await supabase
      .from('checklists')
      .update(updates)
      .eq('id', id)
    if (!error) await fetchChecklists()
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
    
    // Pegar a última posição do item dentro desse checklist
    const list = checklists.find(l => l.id === checklist_id)
    const items = list?.checklist_items || []
    const maxPos = items.length > 0 ? Math.max(...items.map(i => i.position || 0)) : -1

    const { error } = await supabase
      .from('checklist_items')
      .insert({ 
        checklist_id, 
        text, 
        user_id: user.id, 
        completed: false,
        position: maxPos + 1
      })
    if (!error) await fetchChecklists()
  }

  const updateItem = async (item_id: string, text: string) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ text })
      .eq('id', item_id)
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

  const updatePositions = async (type: 'checklist' | 'item', items: { id: string, position: number }[]) => {
    const table = type === 'checklist' ? 'checklists' : 'checklist_items'
    
    // 1. Atualizar estado local IMEDIATAMENTE para feedback visual instantâneo
    setChecklists(prev => {
      if (type === 'checklist') {
        return [...prev].map(list => {
          const found = items.find(i => i.id === list.id)
          return found ? { ...list, position: found.position } : list
        }).sort((a, b) => a.position - b.position)
      } else {
        return prev.map(list => ({
          ...list,
          checklist_items: list.checklist_items?.map(item => {
            const found = items.find(i => i.id === item.id)
            return found ? { ...item, position: found.position } : item
          }).sort((a, b) => a.position - b.position)
        }))
      }
    })

    // 2. Persistir no banco de dados (atualizar cada registro individualmente para garantir que o UPDATE funcione)
    let hasError = false
    for (const item of items) {
      const { error } = await supabase
        .from(table)
        .update({ position: item.position })
        .eq('id', item.id)
      if (error) {
        console.error(`Erro ao atualizar posição ${item.id}:`, error)
        hasError = true
      }
    }

    if (hasError) {
      console.error(`Erro ao atualizar posições de ${type}: reverter para dados do banco`)
      await fetchChecklists()
    }
  }

  return {
    checklists,
    loading,
    fetchChecklists,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    uncheckAll,
    updatePositions,
  }
}
