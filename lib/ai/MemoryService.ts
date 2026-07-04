// lib/ai/MemoryService.ts
// Mantém histórico de mensagens por usuário na tabela chat_histories
// Esta tabela é específica para o chat de texto, separada das transcrições de voz

import type { Message, ConversationMessage } from './types'
import { createServerClient } from '@/lib/supabase-server'

const MAX_MESSAGES = 20

export class MemoryService {

  async recuperar(userId: string): Promise<Message[]> {
    try {
      // Usamos createServerClient porque o MemoryService é chamado dentro de API Routes
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('chat_histories')
        .select('messages')
        .eq('user_id', userId)
        .single()

      if (error || !data) return []

      const mensagens = (data.messages ?? []) as ConversationMessage[]
      return mensagens.map(m => ({ role: m.role, content: m.content }))
    } catch (err) {
      console.error('[MemoryService] Erro ao recuperar conversa:', err)
      return []
    }
  }

  async salvar(userId: string, messages: Message[]): Promise<void> {
    try {
      const supabase = createServerClient()

      const filtered = messages
        .filter(m => m.role !== 'system' && m.role !== 'tool')
        .slice(-MAX_MESSAGES)

      const conversationMessages: ConversationMessage[] = filtered.map(m => ({
        role:      m.role as 'user' | 'assistant',
        content:   m.content,
        createdAt: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('chat_histories')
        .upsert(
          { 
            user_id: userId, 
            messages: conversationMessages, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        )
      
      if (error) throw error
    } catch (err) {
      console.error('[MemoryService] Erro ao salvar conversa:', err)
    }
  }

  async limpar(userId: string): Promise<void> {
    try {
      const supabase = createServerClient()
      const { error } = await supabase
        .from('chat_histories')
        .upsert(
          { 
            user_id: userId, 
            messages: [], 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'user_id' }
        )
      if (error) throw error
    } catch (err) {
      console.error('[MemoryService] Erro ao limpar conversa:', err)
    }
  }
}

export const memoryService = new MemoryService()
