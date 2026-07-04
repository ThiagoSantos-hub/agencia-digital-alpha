// lib/ai/types.ts
// Tipos e interfaces base do módulo Alpha AI
// Todos os outros arquivos de lib/ai dependem deste

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  role:        MessageRole
  content:     string
  toolCallId?: string
  toolName?:   string
}

export interface CRMToolParameter {
  type:        string
  description: string
  enum?:       string[]
}

export interface CRMTool {
  name:        string
  description: string
  parameters:  Record<string, CRMToolParameter>
  required:    string[]
  execute:     (args: Record<string, any>) => Promise<string>
}

export interface AIRequest {
  messages:     Message[]
  tools?:       CRMTool[]
  maxTokens?:   number
  temperature?: number
}

export interface AIResponse {
  text:       string
  toolCalls?: ToolCall[]
  usage?:     { promptTokens: number; completionTokens: number }
}

export interface ToolCall {
  id:   string
  name: string
  args: Record<string, any>
}

export interface AIProvider {
  chat(request: AIRequest): Promise<AIResponse>
}

export interface VoiceProvider {
  sintetizar(texto: string): Promise<Buffer>
  transcrever(audioBuffer: Buffer, mimeType: string): Promise<string>
}

export interface ConversationMessage {
  role:      'user' | 'assistant'
  content:   string
  createdAt: string
}

export interface Conversation {
  userId:   string
  messages: ConversationMessage[]
}

export interface AlphaAIResponse {
  text:         string
  audioBase64?: string
  toolsUsed?:   string[]
}
