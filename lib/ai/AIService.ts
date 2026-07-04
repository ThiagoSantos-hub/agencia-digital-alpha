// lib/ai/AIService.ts — v1.1.0
// Lazy initialization: provider só é criado na primeira chamada,
// não no import (evita throw em build time na Vercel)
import type { AIProvider, AIRequest, AIResponse, CRMTool, Message } from './types'

const SYSTEM_PROMPT = `Você é a Alpha, assistente de inteligência artificial da Agência Digital Alpha.
Você tem acesso aos dados reais do CRM da agência: clientes, campanhas, tarefas, financeiro e integrações.
Responda sempre em português brasileiro, de forma direta e profissional.
Quando precisar de dados, use as ferramentas disponíveis.
Nunca invente dados — se não souber, diga que não tem acesso a essa informação.`

export class AIService {
  private provider: AIProvider | null = null

  private getProvider(): AIProvider {
    if (!this.provider) {
      // Import aqui dentro — só executa em runtime, não em build time
      const { OpenAIProvider } = require('./providers/openai.provider')
      this.provider = new OpenAIProvider()
    }
    return this.provider!
  }

  async chat(
    messages:  Message[],
    tools?:    CRMTool[],
    options?:  { maxTokens?: number; temperature?: number }
  ): Promise<AIResponse> {
    const provider = this.getProvider()
    const systemMessage: Message = { role: 'system', content: SYSTEM_PROMPT }
    const fullMessages = [systemMessage, ...messages]
    const request: AIRequest = {
      messages:    fullMessages,
      tools:       tools,
      maxTokens:   options?.maxTokens   ?? 1024,
      temperature: options?.temperature ?? 0.7,
    }

    let response = await provider.chat(request)

    // Executar tool calls automaticamente (até 5 iterações)
    let iterations = 0
    while (response.toolCalls && response.toolCalls.length > 0 && iterations < 5) {
      iterations++
      const toolResultMessages: Message[] = []
      for (const toolCall of response.toolCalls) {
        const tool = tools?.find(t => t.name === toolCall.name)
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
          role:       'tool',
          content:    result,
          toolCallId: toolCall.id,
          toolName:   toolCall.name,
        })
      }
      const updatedMessages = [
        ...fullMessages,
        { role: 'assistant' as const, content: response.text || '' },
        ...toolResultMessages,
      ]
      response = await provider.chat({ ...request, messages: updatedMessages })
    }

    return response
  }
}

export const alphaAI = new AIService()
