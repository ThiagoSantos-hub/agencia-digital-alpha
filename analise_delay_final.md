# DIAGNÓSTICO COMPLETO — Delay de 5-10 minutos no painel do colaborador

## CAUSAS ENCONTRADAS

### 1. DUAS subscriptions de notificações rodando ao mesmo tempo (layout + NotificationSound)

O layout colaborador importa `useNotificacoes` (linha 77 do layout.tsx) E monta `<NotificationSound />` (linha 235) que importa `useNotifications`.

Isso significa que ao abrir QUALQUER página do colaborador:

| Componente | Hook | O que faz |
|-----------|------|-----------|
| Layout (`useNotificacoes`) | Busca TODAS as notificações do sistema (sem filtro user_id) + REALTIME em ALL INSERT/UPDATE/DELETE | Query global pesada |
| NotificationSound (`useNotifications`) | Busca TODAS as notificações (sem filtro user_id) + REALTIME em INSERT com filter por user_id | Query global pesada + outro useAuth |

**Ambos buscam TODAS as notificações do sistema inteiro** (linha 63 do useNotificacoes e linha 27 do useNotifications — nenhum tem `.eq('user_id', ...)`).

Se houver milhares de notificações no sistema, essas duas queries globais demoram MUITO.

### 2. useNotifications faz ANOTHER useAuth() interno

`useNotifications` (linha 5) importa `useAuth` e chama `const { user } = useAuth()` (linha 19).

Isso significa que ao montar o layout colaborador, `useAuth` é chamado **DUAS VEZES**:
- Uma pelo layout (linha 65)
- Outra pelo NotificationSound → useNotifications (linha 19)

Cada chamada de `useAuth` faz `getSession()` + `fetchProfile()` (query no banco). Isso dobra o tempo de autenticação.

### 3. useChecklists — RPC bloqueante

Toda vez que a página de checklists abre:
```ts
await supabase.rpc('reset_recurring_checklists_by_day')  // BLOQUEIA tudo
```

Se a função RPC demorar (pode ter triggers, loops, ou muitas linhas), o `useEffect` do useChecklists fica travado até o RPC terminar. Só DEPOIS busca os checklists.

### 4. useTasks — RPC bloqueante

Mesmo problema:
```ts
await supabase.rpc('auto_escalate_task_priority')  // BLOQUEIA tudo
```

### 5. useClientes — busca TODOS os clientes + TODOS os finances

```ts
const [clientsRes, financesRes] = await Promise.all([
  supabase.from('clients').select('*'),  // TODOS os clientes do sistema
  supabase.from('finances').select('client_id, data_vencimento, status')  // TODOS os finances
    .eq('tipo', 'receita')
    .in('status', ['pendente', 'atrasado'])
])
```

Busca TODOS os clientes e TODOS os finances do sistema, sem filtro de user_id. Processa tudo no front-end.

### 6. useFinanceiro — busca TODOS os finances do sistema

```ts
supabase.from('finances').select('*, clients (name)')
  .gte('data_vencimento', inicio)
  .lte('data_vencimento', fim)
```

Sem filtro de user_id. Busca TODOS os lançamentos do sistema.

### 7. useCampanhas — busca TODAS as campanhas do sistema

```ts
supabase.from('campaigns').select('*')
```

Sem filtro de user_id ou client_id. Busca TODAS as campanhas.

### 8. NOTIFICATION REALTIME sem filtro de user_id (useNotificacoes)

O `useNotificacoes` subscribe em TODAS as mudanças de notifications (INSERT/UPDATE/DELETE) sem filtro de user_id:
```ts
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' })
```

Cada vez que QUALQUER usuário do sistema recebe uma notificação, TODOS os colaboradores fazem re-fetch.

---

## RESUMO — Por que demora 5-10 minutos

Ao abrir o painel do colaborador, o layout monta e dispara **SIMULTANEAMENTE**:

1. `useAuth` (layout) → getSession + fetchProfile → query no banco
2. `useAuth` (NotificationSound → useNotifications) → getSession + fetchProfile → query no banco
3. `useNotificacoes` (layout) → query GLOBAL em notifications + REALTIME
4. `useNotifications` (NotificationSound) → query GLOBAL em notifications + REALTIME
5. Se a página for checklists → RPC bloqueante + query
6. Se a página for tarefas → RPC bloqueante + query
7. Se a página for clientes → query GLOBAL em clients + finances
8. Se a página for financeiro → query GLOBAL em finances

**5-10 minutos é muito. A causa mais provável é:**
- As duas queries GLOBAIS em `notifications` (useNotificacoes + useNotifications) estão buscando TODAS as notificações de TODOS os usuários do sistema
- Se houver milhares de notificações, isso pode demorar muito (especialmente se não houver índice em `created_at`)
- O `useAuth` duplicado também adiciona delay
- O RPC bloqueante no useChecklists pode estar travando se a função no banco demorar
