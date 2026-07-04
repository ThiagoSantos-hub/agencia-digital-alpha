// lib/ai/providers/openai.provider.ts
// Implementa AIProvider usando fetch nativo — OpenAI gpt-4o-mini com function calling
import type { AIProvider, AIRequest, AIResponse, ToolCall } from '../types'

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string
  private readonly model: string

  constructor(model = 'gpt-4o-mini') {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('[OpenAIProvider] OPENAI_API_KEY não configurada.')
    this.apiKey = key
    this.model  = model
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const tools = request.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name:        t.name,
        description: t.description,
        parameters: {
          type:       'object',
          properties: t.parameters,
          required:   t.required,
        },
      },
    }))

    const body: Record<string, any> = {
      model:       this.model,
      max_tokens:  request.maxTokens  ?? 1024,
      temperature: request.temperature ?? 0.7,
      messages:    request.messages.map(m => {
        // Mensagem assistant com tool_calls — formato exigido pela OpenAI
        if (m.role === 'assistant' && m.rawToolCalls) {
          return {
            role:       'assistant',
            content:    m.content || null,
            tool_calls: m.rawToolCalls,
          }
        }
        // Mensagem tool — precisa de tool_call_id
        if (m.role === 'tool') {
          return {
            role:         'tool',
            content:      m.content,
            tool_call_id: m.toolCallId,
          }
        }
        // Mensagens normais (system, user, assistant sem tools)
        return {
          role:    m.role,
          content: m.content,
        }
      }),
    }

    if (tools && tools.length > 0) {
      body.tools       = tools
      body.tool_choice = 'auto'
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const erro = await response.text()
      throw new Error(`[OpenAIProvider] Erro API: ${response.status} — ${erro}`)
    }

    const data    = await response.json()
    const choice  = data.choices?.[0]
    const message = choice?.message

    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc: any) => ({
      id:   tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? '{}'),
    }))

    return {
      text:         message?.content ?? '',
      toolCalls:    toolCalls.length > 0 ? toolCalls : undefined,
      // Guardar o raw para reenviar na próxima iteração do loop
      rawToolCalls: message?.tool_calls ?? undefined,
      usage: data.usage ? {
        promptTokens:     data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      } : undefined,
    }
  }
}
