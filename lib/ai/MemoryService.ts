// lib/ai/MemoryService.ts
// Lê e escreve na tabela conversations (já existe no Supabase)
// Mantém histórico de mensagens por usuário

import type { Message, ConversationMessage } from './types'
import { createClient } from '@/lib/supabase'

const MAX_MESSAGES = 20

export class MemoryService {

  async recuperar(userId: string): Promise<Message[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('user_id', userId)
        .single()

      if (error || !data) return []

      const mensagens = (data.messages ?? []) as ConversationMessage[]
      return mensagens.map(m => ({ role: m.role, content: m.content }))
    } catch {
      return []
    }
  }

  async salvar(userId: string, messages: Message[]): Promise<void> {
    try {
      const supabase = createClient()

      const filtered = messages
        .filter(m => m.role !== 'system' && m.role !== 'tool')
        .slice(-MAX_MESSAGES)

      const conversationMessages: ConversationMessage[] = filtered.map(m => ({
        role:      m.role as 'user' | 'assistant',
        content:   m.content,
        createdAt: new Date().toISOString(),
      }))

      await supabase
        .from('conversations')
        .upsert(
          { user_id: userId, messages: conversationMessages, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    } catch (err) {
      console.error('[MemoryService] Erro ao salvar conversa:', err)
    }
  }

  async limpar(userId: string): Promise<void> {
    try {
      const supabase = createClient()
      await supabase
        .from('conversations')
        .upsert(
          { user_id: userId, messages: [], updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    } catch (err) {
      console.error('[MemoryService] Erro ao limpar conversa:', err)
    }
  }
}

export const memoryService = new MemoryService()
