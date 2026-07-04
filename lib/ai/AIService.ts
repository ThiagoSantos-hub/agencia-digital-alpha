// lib/ai/AIService.ts — v1.3.0
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

    // [FIX v1.3] fullMessages é mutável — atualizado a cada iteração do loop
    // para manter os pares assistant+tool_calls+tool em sequência correta
    let fullMessages: Message[] = [systemMessage, ...messages]

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

      // Mensagem assistant COM rawToolCalls — obrigatória antes das mensagens tool
      const assistantMessage: Message = {
        role:         'assistant',
        content:      response.text || '',
        rawToolCalls: response.rawToolCalls,
      }

      // Executar cada tool e coletar resultados
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

      // [FIX v1.3] Atualiza fullMessages acumulando corretamente:
      // [...anterior, assistant+tool_calls, ...tool results]
      // Assim a próxima iteração tem o contexto completo e correto
      fullMessages = [
        ...fullMessages,
        assistantMessage,
        ...toolResultMessages,
      ]

      response = await provider.chat({ ...request, messages: fullMessages })
    }

    return response
  }
}

export const alphaAI = new AIService()
