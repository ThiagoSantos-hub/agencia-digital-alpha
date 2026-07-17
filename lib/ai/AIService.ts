// lib/ai/AIService.ts — v1.5.1 (respostas curtas)
import type { AIProvider, AIRequest, AIResponse, CRMTool, Message } from './types'
import { buildSystemPersonaBlock, DEFAULT_NOTES, type BrainNote } from './alphaPersona'

const CRM_HINT = `
CRM: use ferramentas só quando a pergunta exigir dado real.
Depois da ferramenta, responda em 1 frase com o resultado. Sem rodeios.
`.trim()

export class AIService {
  private provider: AIProvider | null = null

  private getProvider(): AIProvider {
    if (!this.provider) {
      const { OpenAIProvider } = require('./providers/openai.provider')
      this.provider = new OpenAIProvider()
    }
    return this.provider!
  }

  private getDynamicSystemPrompt(notes?: BrainNote[]): string {
    const agora = new Date()
    const dataHoraBrasilia = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const brain = buildSystemPersonaBlock(notes?.length ? notes : DEFAULT_NOTES)
    return `${brain}\n\n${CRM_HINT}\n\nDATA E HORA (Brasília): ${dataHoraBrasilia}`
  }

  async chat(
    messages: Message[],
    tools?: CRMTool[],
    options?: { maxTokens?: number; temperature?: number; notes?: BrainNote[] }
  ): Promise<AIResponse> {
    const provider = this.getProvider()
    const systemMessage: Message = {
      role: 'system',
      content: this.getDynamicSystemPrompt(options?.notes),
    }

    let fullMessages: Message[] = [systemMessage, ...messages]

    const request: AIRequest = {
      messages: fullMessages,
      tools: tools,
      // Limite baixo força resposta curta (voz + tokens)
      maxTokens: options?.maxTokens ?? 180,
      temperature: options?.temperature ?? 0.4,
    }

    let response = await provider.chat(request)

    let iterations = 0
    while (response.toolCalls && response.toolCalls.length > 0 && iterations < 5) {
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
            result = `Erro ao executar ${toolCall.name}: ${err.message}`
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
