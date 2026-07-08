# Análise Completa — Delay do painel do colaborador (5-10 minutos)

## Estrutura do layout colaborador (cada page abre com isso)

### Hooks carregados no layout (linha 65-77):
1. `useAuth()` — busca session + profile (async)
2. `useNotificacoes()` — busca notificações + REALTIME subscription

### Hooks carregados nas páginas individuais:
- Dashboard: `useAuth()` + query `clients` + query `campaigns`
- Checklists: `useChecklists()` — chama RPC `reset_recurring_checklists_by_day` antes de buscar
- Campanhas: `useCampanhas()` + `useMetaAccount()` + `useClientes()`
- Tarefas: `useTarefas()` (precisa verificar)
- Financeiro: `useFinanceiro()` (precisa verificar)
- Clientes: `useClientes()` (precisa verificar)
- Integracoes: próprio

## PROBLEMAS IDENTIFICADOS

### 1. useNotificacoes — REALTIME subscription SEM filter por user_id
O hook subscribe em ALL INSERT/UPDATE/DELETE da tabela notifications SEM filtrar por user_id.
Isso significa que cada vez que QUALQUER usuário do sistema recebe uma notificação, TODOS os colaboradores fazem re-fetch.
Muitos colaboradores = muitas subscriptions = pode travar.

### 2. useChecklists — RPC bloqueante
Cada vez que o colaborador abre a página de checklists, o hook chama:
`await supabase.rpc('reset_recurring_checklists_by_day')`
Essa RPC pode estar lenta ou até travando se houver muitos checklists.

### 3. useAuth — double fetch
useAuth faz getSession() + fetchProfile(). Se o profile demora (query no banco), o layout inteiro fica bloqueado.

### 4. useNotificacoes — fetch inicial SEM filtro de user_id
O fetch busca `notifications` sem `eq('user_id', ...)`. Busca TODAS as notificações não lidas do sistema, não só do usuário.
Se houver milhares de notificações, isso demora MUITO.

### 5. useNotificacoes — dependency loop
A dependência `[fetchNotificacoes, supabase]` no useEffect pode causar re-fetch infinito se `fetchNotificacoes` muda (porque depende de `notificacoes.length`).

## PRÓXIMOS PASSOS
- Verificar cada hook individual (useCampanhas, useTarefas, useFinanceiro, useClientes)
- Verificar se há queries que buscam TODOS os dados sem filtro de user_id
- Verificar se há alguma query que busca milhões de linhas
