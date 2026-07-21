// lib/ai/AIService.ts — v2.0.0 (personalidade/prompt montado no n8n)
import type { AIProvider, AIRequest, AIResponse, CRMTool, Message } from './types'
import { DEFAULT_NOTES, type BrainNote } from './alphaPersona'

export class AIService {
  private getProvider(apiKey: string): AIProvider {
    const { N8nBrainProvider } = require('./providers/n8nBrain.provider')
    return new N8nBrainProvider(apiKey)
  }

  async chat(
    apiKey: string,
    messages: Message[],
    tools?: CRMTool[],
    options?: {
      maxTokens?: number
      temperature?: number
      notes?: BrainNote[]
      crmSnapshot?: string
      compact?: boolean
      preferredName?: string
      workContext?: string
    }
  ): Promise<AIResponse> {
    const provider = this.getProvider(apiKey)

    const dataHoraBrasilia = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })

    const request: AIRequest = {
      messages,
      tools,
      maxTokens: options?.maxTokens ?? 120,
      temperature: options?.temperature ?? 0.3,
      personaContext: {
        notes: (options?.notes?.length ? options.notes : DEFAULT_NOTES).map((n) => ({
          area: n.area,
          title: n.title,
          body: n.body,
        })),
        crmSnapshot: options?.crmSnapshot,
        compact: options?.compact,
        preferredName: options?.preferredName,
        workContext: options?.workContext,
        dataHora: dataHoraBrasilia,
      },
    }

    let fullMessages = messages
    let response = await provider.chat(request)

    let iterations = 0
    while (response.toolCalls && response.toolCalls.length > 0 && iterations < 2) {
      iterations++

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text || '',
        rawToolCalls: response.rawToolCalls,
      }

      const toolResultMessages: Message[] = []
      for (const toolCall of response.toolCalls) {
        const tool = tools?.find((t) => t.name === toolCall.name)
        let result = ''
        if (tool) {
          try {
            result = await tool.execute(toolCall.args)
          } catch (err: any) {
            result = `Erro: ${err.message}`
          }
        } else {
          result = `Ferramenta "${toolCall.name}" não encontrada.`
        }
        toolResultMessages.push({
          role: 'tool',
          content: result,
          toolCallId: toolCall.id,
          toolName: toolCall.name,
        })
      }

      fullMessages = [...fullMessages, assistantMessage, ...toolResultMessages]
      response = await provider.chat({ ...request, messages: fullMessages })
    }

    return response
  }
}

export const alphaAI = new AIService()
