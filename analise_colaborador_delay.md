# Diagnóstico — Delay do painel do colaborador

## A causa raiz está no MIDDLEWARE

O middleware (`middleware.ts`) faz o seguinte na linha 50-52:

```tsx
if (user && isAuthRoute) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

Quando o colaborador já está logado e tenta acessar `/login`, o middleware redireciona para `/dashboard` (rota do admin). Isso significa:

1. Colaborador faz login
2. Login redireciona para `/colaborador/dashboard` (correto, ajuste já feito)
3. MAS se o colaborador tentar acessar qualquer rota protegida diretamente (ou se houver um redirect intermediário), o middleware pode estar redirecionando para `/dashboard` primeiro

## MAIS IMPORTANTE: O middleware NÃO verifica o role

O middleware (linha 46-48) redireciona para `/login` se não tem user. MAS na linha 50-52, se TEM user e está na rota de auth (login), redireciona para `/dashboard`.

Isso significa que se o colaborador faz login e algo o manda para `/login` (ou se o sistema passa por `/login` no caminho), o middleware redireciona para `/dashboard` (admin) em vez de `/colaborador/dashboard`.

## O FLUXO DO PROBLEMA

| Etapa | O que acontece |
|-------|---------------|
| 1 | Colaborador faz login → redirect para `/colaborador/dashboard` (login ajustado) |
| 2 | Colaborador navega para `/login` (manualmente ou por algum trigger) |
| 3 | Middleware vê: user existe + isAuthRoute = true |
| 4 | Middleware redireciona para `/dashboard` (ADMIN!) |
| 5 | Layout admin recebe o user, layout colaborador bloqueia |
| 6 | Colaborador VÊ o painel admin |
| 7 | Layout admin useEffect redireciona para `/colaborador/dashboard` |
| 8 | Layout colaborador renderiza |

## SOLUÇÃO

No middleware, em vez de sempre redirecionar para `/dashboard`, verificar o role e redirecionar para o painel correto:

```tsx
if (user && isAuthRoute) {
  // Buscar role do profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role === 'collaborator') {
    return NextResponse.redirect(new URL('/colaborador/dashboard', request.url))
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

PORÉM: o middleware roda a cada request e fazer uma query no banco toda vez pode ser lento. Uma solução melhor seria apenas não redirecionar colaborador para o dashboard do admin.

## SOLUÇÃO MAIS SIMPLES E SEGURA

Mudar o redirect no middleware para redirecionar baseado no role:

```tsx
if (user && isAuthRoute) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const dest = profile?.role === 'collaborator' ? '/colaborador/dashboard' : '/dashboard'
  return NextResponse.redirect(new URL(dest, request.url))
}
```

Isso garante que:
- Colaborador → vai direto para `/colaborador/dashboard`
- Admin → vai para `/dashboard`

Sem delay, sem flash, sem "outra tela".
