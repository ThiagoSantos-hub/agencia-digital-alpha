# Diagnóstico — Flash de tela ao abrir a aplicação (admin e colaborador)

## Comportamento descrito
Quando o usuário abre a aplicação do zero (faz login e o sistema inicia), aparece primeiro uma tela intermediária e depois a tela correta. Tanto o admin quanto o colaborador passam por isso.

## Fluxo atual — O que acontece passo a passo

### 1. Usuário faz login
`login/page.tsx` (linha 51): `router.push('/dashboard')`
→ SEMPRE manda para `/dashboard` (rota do admin), independente do role do usuário.

### 2. Chega no layout admin (app/(app)/layout.tsx)
O layout admin recebe o usuário colaborador (porque foi mandado para `/dashboard`).
Dentro do layout admin:
- Linha 12: `const { user, profile, loading } = useAuth()`
- Linha 23-28: Enquanto `loading && !user`, mostra tela "Carregando Alpha..."
- Linha 31: `if (!user) return null`
- Linha 16-20: useEffect — quando `loading` é false e `profile?.role === 'collaborator'`, faz `router.push('/colaborador/dashboard')`

### 3. Problema aqui — SEQUÊNCIA DE EVENTOS

O `useAuth` faz duas chamadas assíncronas:
1. `getSession()` → obtém o `user` (rápido)
2. `fetchProfile()` → obtém o `profile` com o `role` (demora mais — consulta no banco)

A sequência temporal é:

| Tempo | Evento | O que o usuário vê |
|-------|--------|-------------------|
| T0 | Login, redirect para `/dashboard` | Tela de login |
| T1 | Chega no layout admin (app) | "Carregando Alpha..." (loading = true, !user) |
| T2 | getSession() retorna user | Ainda "Carregando Alpha..." (loading = true, mas user existe, profile ainda não) |
| T3 | useAuth termina loading, user existe mas profile.role ainda não chegou | O useEffect do layout admin verifica: `!loading && !user` → falso. `!loading && profile?.role === 'collaborator'` → profile ainda não chegou ou role não está pronto. Mostra o layout admin com Sidebar + Header. |
| T4 | fetchProfile() retorna profile com role='collaborator' | useEffect roda novamente: `router.push('/colaborador/dashboard')` |
| T5 | Layout colaborador renderiza | Tela do colaborador aparece |
| T6 | Profile loading termina no layout colaborador | Tela final renderiza |

### O problema: O layout admin RENDERIZA antes do redirect

No layout admin, a condição `if (!user) return null` (linha 31) só bloqueia quando NÃO tem user. MAS quando tem user mas o profile.role ainda não chegou, o layout renderiza o Sidebar + Header + Header + conteúdo. Isso significa que o usuário VÊ o layout admin completo por um instante antes de ser redirecionado para o colaborador.

Isso é o "flash" — aparece o painel admin (com sidebar, header, etc.) por 1-2 segundos, e depois some e aparece o painel do colaborador.

O mesmo acontece no sentido inverso: se um admin faz login e o profile demora a chegar, o layout admin pode renderizar parcialmente.

## CAUSA RAIZ CONFIRMADA

O problema está na **ordem de carregamento do `useAuth`**:

1. `user` chega primeiro (via `getSession()`)
2. `profile` com `role` chega depois (via `fetchProfile()` — consulta no banco)
3. O layout admin usa `if (!user) return null` — mas quando `user` existe e `profile` ainda não, o layout RENDERIZA o sidebar e header
4. Só quando `profile.role` chega é que o useEffect faz o redirect para o colaborador

## SOLUÇÃO

A correção é simples e não altera funcionalidades:

**No layout admin:** Mudar a condição de bloqueio para esperar o profile também, não só o user:
```tsx
// Antes:
if (loading && !user) { ... }
if (!user) return null

// Depois:
if (loading || (!user && !profile)) { ... }
if (!user || !profile) return null

// E o useEffect de redirect fica mais simples:
useEffect(() => {
  if (!loading && user && profile?.role === 'collaborator') {
    router.push('/colaborador/dashboard')
  }
}, [user, profile, loading, router])
```

**Na página de login:** Redirecionar baseado no role ao invés de sempre `/dashboard`:
```tsx
// Em vez de:
router.push('/dashboard')

// Usar o role para decidir:
if (profile?.role === 'collaborator') {
  router.push('/colaborador/dashboard')
} else {
  router.push('/dashboard')
}
```

Porém, na página de login o profile ainda não está disponível no momento do login (o signIn só retorna o user). Então a melhor solução é apenas no layout.

**Melhor solução (só no layout):**
No layout admin, NÃO renderizar nada até que o profile.role esteja disponível:
```tsx
// Bloquear renderização enquanto loading OU enquanto não tem profile com role definido
if (loading || (user && !profile)) {
  return <LoadingScreen />
}
```

Isso garante que o layout admin NUNCA seja mostrado para um colaborador, mesmo por um instante.
