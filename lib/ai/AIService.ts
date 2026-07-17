// lib/ai/AIService.ts — v1.5.3 (menos rodadas de tool)
import type { AIProvider, AIRequest, AIResponse, CRMTool, Message } from './types'
import { buildSystemPersonaBlock, DEFAULT_NOTES, type BrainNote } from './alphaPersona'

export class AIService {
  private provider: AIProvider | null = null

  private getProvider(): AIProvider {
    if (!this.provider) {
      const { OpenAIProvider } = require('./providers/openai.provider')
      this.provider = new OpenAIProvider()
    }
    return this.provider!
  }

  private getDynamicSystemPrompt(notes?: BrainNote[], crmSnapshot?: string): string {
    const agora = new Date()
    const dataHoraBrasilia = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const brain = buildSystemPersonaBlock(notes?.length ? notes : DEFAULT_NOTES)

    const crmBlock = crmSnapshot
      ? `CRM AGORA: ${crmSnapshot}\nUse estes números para perguntas de contagem/resumo. Só use ferramenta se precisar de lista ou ação.`
      : `Para dados do CRM use as ferramentas. Não invente.`

    return `${brain}\n\n${crmBlock}\n\nDATA (Brasília): ${dataHoraBrasilia}`
  }

  async chat(
    messages: Message[],
    tools?: CRMTool[],
    options?: {
      maxTokens?: number
      temperature?: number
      notes?: BrainNote[]
      crmSnapshot?: string
    }
  ): Promise<AIResponse> {
    const provider = this.getProvider()
    const systemMessage: Message = {
      role: 'system',
      content: this.getDynamicSystemPrompt(options?.notes, options?.crmSnapshot),
    }

    let fullMessages: Message[] = [systemMessage, ...messages]

    const request: AIRequest = {
      messages: fullMessages,
      tools: tools,
      maxTokens: options?.maxTokens ?? 120,
      temperature: options?.temperature ?? 0.3,
    }

    let response = await provider.chat(request)

    // Máximo 2 rodadas de tool (antes 5) — menos latência
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
