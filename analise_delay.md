# Análise — Delay de abertura e flash de tela no painel de checklists

## Comportamento descrito
1. Ao abrir a tela de checklists, aparece primeiro uma tela intermediária (provavelmente a tela de "Sincronizando Alpha..." com spinner)
2. Depois a tela correta do checklists aparece
3. Ambos os painéis (admin e colaborador) têm o mesmo problema

## Análise do fluxo

### Página Admin (linha 130-139):
```tsx
if (loading && checklists.length === 0) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0f0c]">
      <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin" />
      <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Sincronizando Alpha...</p>
    </div>
  )
}
```

### Página Colaborador (linha 129-138):
```tsx
if (loading && checklists.length === 0) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0f0c]">
      <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin" />
      <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Carregando suas rotinas...</p>
    </div>
  )
}
```

### Hook useChecklists (linha 37-69):
```tsx
const fetchChecklists = useCallback(async () => {
  if (!user) return
  setLoading(true)
  try {
    // PRIMEIRO: chama RPC de reset
    try {
      await supabase.rpc('reset_recurring_checklists_by_day')
    } catch (rpcErr) {
      console.warn('Função RPC de reset ainda não existe ou falhou:', rpcErr)
    }

    // DEPOIS: busca os checklists
    const { data, error } = await supabase
      .from('checklists')
      .select('*, checklist_items(*)')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    
    setChecklists(dataWithSortedItems || [])
  } catch (err) {
    console.error('Erro ao buscar checklists:', err)
  } finally {
    setLoading(false)
  }
}, [user, supabase])

useEffect(() => {
  fetchChecklists()
}, [fetchChecklists])
```

## DIAGNÓSTICO — A causa raiz do delay

### Problema 1: O RPC `reset_recurring_checklists_by_day` é executado ANTES da busca

O hook primeiro chama `supabase.rpc('reset_recurring_checklists_by_day')` — que é uma função do banco de dados que pode ser lenta. Essa chamada bloqueia o fluxo: o `loading` fica `true`, a tela mostra o spinner, e só DEPOIS que o RPC termina é que busca os checklists reais.

Se essa função RPC demora 2-3 segundos (ou mais), o usuário vê a tela de loading por esse tempo inteiro.

### Problema 2: O `useAuth` pode estar causando um re-render

O hook `useChecklists` depende de `user` do `useAuth`. Se o `useAuth` tem um estado de loading próprio (verificando sessão), o componente pode renderizar primeiro SEM o user (mostrando uma tela vazia ou de login), depois com o user (entrando no fetchChecklists), e depois sem loading (mostrando os checklists). Isso cria o efeito de "duas telas brigando".

### Problema 3: A condição `loading && checklists.length === 0`

Enquanto `loading` é true E `checklists.length === 0`, mostra o spinner. MAS se `loading` é true E `checklists.length > 0` (dados antigos ainda no estado), a condição é falsa e mostra a tela normal COM o spinner invisível. Isso pode causar um flash.

## SOLUÇÃO

A solução é simples e segura:

1. **Executar o RPC em background** — não bloquear o fetch com o RPC. Chamar o RPC de forma assíncrona sem `await`, para que a busca dos checklists não espere por ele.

2. **Ou** — remover o RPC da chamada inicial e deixar que ele seja chamado por um schedule/cron job no Supabase (se existir a migração 043 que já tem o trigger).

3. **Melhorar a condição de loading** — para que a transição entre a tela de loading e a tela de checklists seja suave, sem flash.
