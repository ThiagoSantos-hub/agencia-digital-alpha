# Correção de Memória de Conversa - Alpha IA

## Problema Identificado

A Alpha IA não estava mantendo o contexto das conversas. Cada mensagem era tratada como uma nova conversa, causando:
- Perda de contexto entre mensagens
- Impossibilidade de fazer perguntas de acompanhamento
- Respostas inconsistentes que traziam dados novos a cada mensagem

### Causas Raiz

1. **Tabela Incompatível**: O `MemoryService` tentava usar uma coluna `messages` que não existia na tabela `conversations`. A tabela original foi criada apenas para armazenar transcrições de voz (coluna `transcript`).

2. **Cliente Supabase Errado**: O `MemoryService` estava usando `createClient()` (cliente do navegador) em vez de `createServerClient()` (cliente do servidor com autenticação). Isso causava falhas de autenticação ao tentar salvar/recuperar mensagens.

3. **Conflito de Uso**: A tabela `conversations` era usada para armazenar transcrições de voz do widget `AlphaWidget.tsx`, criando conflito com o uso de chat de texto.

## Solução Implementada

### 1. Nova Tabela: `chat_histories`

Criada uma tabela específica para histórico de chat (arquivo: `supabase/migrations/011_chat_histories_table.sql`):

```sql
CREATE TABLE chat_histories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_histories_user_id_key UNIQUE (user_id)
);
```

**Características:**
- Uma linha por usuário (UNIQUE constraint em `user_id`)
- Coluna `messages` armazena array JSONB de mensagens
- RLS policies garantem que cada usuário só acesse suas próprias mensagens
- UPDATE policy permite que o usuário atualize seu histórico

### 2. Atualização do `MemoryService`

**Arquivo**: `lib/ai/MemoryService.ts`

Mudanças:
- ✅ Usa `createServerClient()` em vez de `createClient()` (autenticação correta)
- ✅ Consulta/salva em `chat_histories` em vez de `conversations`
- ✅ Mantém até 20 mensagens por conversa (configurável via `MAX_MESSAGES`)
- ✅ Filtra automaticamente mensagens de sistema e tool

### 3. Melhorias no System Prompt

**Arquivo**: `lib/ai/AIService.ts`

Adicionado ao system prompt:
```
IMPORTANTE: Você está em uma conversa contínua com o usuário. Lembre-se de TODAS as mensagens anteriores nesta sessão.
Se o usuário fizer uma pergunta de acompanhamento, use o contexto anterior para responder de forma coerente.
Não traga dados novos sem motivo — mantenha a continuidade da conversa.
```

Isso garante que o modelo LLM respeite o histórico passado e mantenha coerência.

## Como Funciona Agora

### Fluxo de uma Mensagem

1. **Usuário envia mensagem** (via chat ou áudio)
2. **API `/api/ai`** recebe a mensagem
3. **Recupera histórico**: `memoryService.recuperar(user.id)` busca todas as mensagens anteriores de `chat_histories`
4. **Monta contexto**: Combina histórico + nova mensagem
5. **Chama Alpha IA**: Passa contexto completo para o modelo LLM
6. **Salva resposta**: `memoryService.salvar(user.id, [...historico, novaResposta])`
7. **Retorna resposta**: Envia texto e áudio (opcional) para o frontend

### Exemplo de Conversa

```
Usuário: "Alfa, traga para mim as campanhas DPA distribuidora"
Alpha: [busca campanhas da DPA, retorna lista]

Usuário: "Quanto essas duas campanhas gastaram?"
Alpha: [AGORA usa o contexto anterior, sabe que são as campanhas da DPA, calcula gasto]
       [Antes: trazia campanhas de outras empresas]

Usuário: "E qual foi o ROI?"
Alpha: [Continua no mesmo contexto, calcula ROI das campanhas da DPA]
```

## Separação de Responsabilidades

- **`chat_histories`**: Histórico de chat de texto (novo)
- **`conversations`**: Transcrições de voz do widget ElevenLabs (mantém-se como estava)

Cada tabela tem seu próprio propósito e não há conflito.

## Próximos Passos (Opcional)

1. **Sincronizar voz com chat**: Se quiser que o widget de voz também mantenha contexto com o chat, pode-se integrar a ferramenta `buscar_memoria` do ElevenLabs com a nova tabela.

2. **Melhorar persistência**: Adicionar timestamps mais granulares ou categorizar mensagens por tipo (pergunta, resposta, ferramenta usada).

3. **Limpeza automática**: Implementar job para limpar históricos antigos (ex: > 30 dias).

## Testes Recomendados

1. Abrir chat e enviar 3-4 mensagens seguidas
2. Verificar se cada resposta lembra das anteriores
3. Fazer perguntas de acompanhamento que dependem do contexto
4. Testar com áudio (botão de microfone)
5. Verificar se widget de voz continua funcionando normalmente

## Arquivos Modificados

- `supabase/migrations/011_chat_histories_table.sql` (novo)
- `lib/ai/MemoryService.ts` (atualizado)
- `lib/ai/AIService.ts` (system prompt melhorado)
