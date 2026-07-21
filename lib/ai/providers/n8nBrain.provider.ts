// lib/ai/providers/n8nBrain.provider.ts
// Provider que delega a decisão da resposta pro workflow do n8n, em vez de
// chamar a OpenAI direto — o n8n monta o system prompt final (personalidade,
// editável lá) e faz a chamada de verdade pra OpenAI usando a chave pessoal
// do usuário que chega em cada requisição.
import type { AIProvider, AIRequest, AIResponse, ToolCall } from '../types'

export class N8nBrainProvider implements AIProvider {
  private readonly apiKey: string
  private readonly webhookUrl: string

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('[N8nBrainProvider] Chave da OpenAI não informada.')
    const url = process.env.N8N_ALPHA_BRAIN_WEBHOOK_URL
    if (!url) throw new Error('[N8nBrainProvider] N8N_ALPHA_BRAIN_WEBHOOK_URL não configurada.')
    this.apiKey = apiKey
    this.webhookUrl = url
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const tools = request.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters,
          required: t.required,
        },
      },
    }))

    const messages = request.messages.map((m) => {
      if (m.role === 'assistant' && m.rawToolCalls) {
        return { role: 'assistant', content: m.content || null, tool_calls: m.rawToolCalls }
      }
      if (m.role === 'tool') {
        return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
      }
      return { role: m.role, content: m.content }
    })

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: this.apiKey,
        messages,
        tools,
        maxTokens: request.maxTokens ?? 120,
        temperature: request.temperature ?? 0.3,
        personaContext: request.personaContext ?? {},
      }),
    })

    if (!response.ok) {
      const erro = await response.text()
      throw new Error(`[N8nBrainProvider] Erro no webhook do n8n: ${response.status} — ${erro}`)
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message

    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? '{}'),
    }))

    return {
      text: message?.content ?? '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      rawToolCalls: message?.tool_calls ?? undefined,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    }
  }
}
