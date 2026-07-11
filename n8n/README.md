# Workflow N8N — Verificador de Relatórios Agendados

## Visão Geral

Este workflow verifica automaticamente a tabela `reports` no Supabase (produção) a cada 15 minutos e dispara os relatórios cuja data `proximo_envio` já venceu. Após o disparo bem-sucedido, recalcula e atualiza o `proximo_envio` conforme a frequência configurada.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `workflow_verificador_relatorios.json` | Arquivo JSON exportável para importação no N8N |
| `README.md` | Este arquivo — instruções de configuração e importação |

## Fluxo do Workflow

```
Schedule Trigger (15 min)
    → Consultar Relatórios Pendentes (HTTP GET via REST API Supabase)
    → Filtrar Relatórios Válidos (Code node)
    → Disparar Webhook (POST → webhook.digitalalpha.cloud)
    → Calcular Próximo Envio (Code node)
        → Separar Updates e Skips (Code node)
            → Atualizar Proximo Envio (HTTP PATCH via REST API Supabase)
                → Log de Execução (Code node)
```

### Detalhamento dos Nodes

1. **Schedule Trigger** — Executa a cada 15 minutos (`*/15 * * * *`).

2. **Consultar Relatórios Pendentes** — HTTP GET para a REST API do Supabase com filtro:
   - `ativo=eq.true`
   - `proximo_envio=lte.now()`
   - Seleciona: `id, mensagem_template, mensagem, recebedor_numero, frequencia, dias_semana, horario_envio, proximo_envio, ativo`

3. **Filtrar Relatórios Válidos** — Código que remove resultados sem `id`, `mensagem_template` ou `recebedor_numero`.

4. **Disparar Webhook** — POST para `https://webhook.digitalalpha.cloud/webhook/disparo-relatorio` com body:
   ```json
   {
     "report_id": "<id>",
     "recebedor_numero": "<recebedor_numero>",
     "mensagem": "<mensagem_template>"
   }
   ```

5. **Calcular Próximo Envio** — Lógica de recálculo:
   - `diario`: +1 dia, mantém horário
   - `semanal`: próximo dia válido de `dias_semana`, mantém horário
   - `mensal`: +1 mês, mantém horário
   - `manual`: **não** recalcula, **não** atualiza `proximo_envio`
   - Se webhook retornou erro (HTTP 400+): **não** recalcula (tentará novamente no próximo ciclo)

6. **Separar Updates e Skips** — Filtra apenas relatórios que precisam de atualização no Supabase.

7. **Atualizar Proximo Envio** — HTTP PATCH para atualizar `proximo_envio` no Supabase.

8. **Log de Execução** — Registra em console logs dos relatórios disparados e suas ações.

## Como Importar no N8N

### Pré-requisitos

1. Acessar o N8N em produção: [https://n8n.digitalalpha.cloud](https://n8n.digitalalpha.cloud)
2. Ter credencial **Supabase Service Role** configurada no N8N com:
   - Header: `apikey` = valor de `SUPABASE_SERVICE_ROLE_KEY`
   - Header: `Authorization` = `Bearer <SUPABASE_SERVICE_ROLE_KEY>`
   - URL base: `NEXT_PUBLIC_SUPABASE_URL`

### Passos de Importação

1. No N8N, clique em **"Add Workflow"** (botão "+" no topo)
2. Clique no menu **"..."** → **"Import from File"**
3. Selecione o arquivo `workflow_verificador_relatorios.json`
4. Configure a credencial **Supabase Service Role** nos nodes:
   - "Consultar Relatórios Pendentes"
   - "Atualizar Proximo Envio"
5. **Teste manual**: force um relatório com `proximo_envio` no passado e execute o workflow manualmente
6. Confirme que o disparo aconteceu e o `proximo_envio` foi recalculado
7. Ative o workflow (toggle **Active = ON**)

### Credenciais Necessárias no N8N

| Credencial | Tipo | Node(s) |
|---|---|---|
| Supabase Service Role | HTTP Header Auth | Consultar Relatórios Pendentes, Atualizar Proximo Envio |

> **Nota:** O arquivo JSON referencia credenciais por nome ("Supabase Service Role"). Se o nome da credencial no N8N for diferente, edite o campo `credentials.name` no JSON ou reatribua manualmente após a importação.

### Environment Variables (N8N)

O workflow usa `$env.SUPABASE_URL`. Certifique-se de que esta variável está configurada nas settings do N8N:

```
SUPABASE_URL = <valor de NEXT_PUBLIC_SUPABASE_URL>
```

## Teste Manual

Para testar o workflow antes de ativar:

```sql
-- Force o proximo_envio de um relatório para o passado
UPDATE reports
SET proximo_envio = NOW() - INTERVAL '1 hour'
WHERE id = '<id_do_relatorio>' AND ativo = true;
```

Depois execute o workflow manualmente no N8N e verifique:
- O webhook foi chamado
- O `proximo_envio` foi atualizado na tabela
