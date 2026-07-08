# Diagnóstico Completo — Persistência de Ordem no Painel Checklist

## Fluxo atual de drag-and-drop das listas (paine principal)

### Sequência de eventos ao arrastar uma lista:

1. **handleDragStart** (page.tsx linha 63): `setActiveId(event.active.id)`
2. **Arrasto visual**: O DndContext renderiza o DragOverlay sobre a lista ativa
3. **handleDragEnd** (page.tsx linha 67):
   - Calcula `oldIndex` e `newIndex` no array `pendingLists` (que já está ordenado por `position` após a correção anterior)
   - Chama `arrayMove(pendingLists, oldIndex, newIndex)`
   - Mapeia as posições: `newLists.map((list, index) => ({ id: list.id, position: index }))`
   - Chama `await updatePositions('checklist', positions)`

### Dentro de updatePositions (useChecklists.ts linha 168):

**Passo 1 — Atualização local imediata (linha 172):**
```ts
setChecklists(prev => {
  if (type === 'checklist') {
    return [...prev].map(list => {
      const found = items.find(i => i.id === list.id)
      return found ? { ...list, position: found.position } : list
    }).sort((a, b) => a.position - b.position)
  }
  ...
})
```
→ Isso atualiza o estado `checklists` com as novas posições e ordena por `position`.

**Passo 2 — Persistência no banco (linha 190):**
```ts
const { error } = await supabase
  .from(table)
  .upsert(items.map(item => ({ id: item.id, position: item.position })), { onConflict: 'id' })
```
→ Usa `upsert` com `{ onConflict: 'id' }`, enviando apenas `{ id, position }`.

### Análise do upsert no Supabase:

O problema potencial aqui é que o Supabase `upsert` com apenas `{ id, position }` pode:
- **Funcionar** se a tabela permitir update parcial (colunas não especificadas mantêm seus valores)
- **Falhar** se alguma constraint NOT NULL ou trigger exigir campos adicionais

Olhando o schema (012_checklists.sql), as colunas obrigatórias são `user_id` e `title` para checklists. Porém, como é um upsert (update de um registro existente), o Supabase normalmente apenas atualiza as colunas especificadas.

**MAS** — o ponto crítico é a política RLS!

## Análise das políticas RLS

Existem **TRÊS conjuntos de políticas** que podem estar em conflito:

1. **012_checklists.sql** (linha 31): `CREATE POLICY "checklists_update" ON checklists FOR UPDATE USING (auth.uid() = user_id);`
2. **055_fix_checklist_permissions.sql** (linha 8): `CREATE POLICY "Users can update their own checklists" ON public.checklists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
3. **fix_checklists_privacy.sql** (linha 18): `CREATE POLICY "checklists_personal_access" ON checklists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`

Se a política `055` foi executada, ela faz DROP da policy "Users can update their own checklists" e recria. Mas a política `fix_checklists_privacy.sql` faz DROP de "checklists_update_policy" (nome diferente!) e cria "checklists_personal_access".

**O problema:** A política original de 012 se chama `"checklists_update"` (sem _policy no final). Se nenhuma das migrações depois de 012 fez DROP dela, ela ainda pode estar ativa e causando conflito com a upsert.

**Para checklist_items:** A política RLS de UPDATE na migração 055 usa `EXISTS (SELECT ... WHERE checklists.user_id = auth.uid())`. Isso significa que para atualizar a position de um item, o Supabase precisa verificar se o checklist pai pertence ao usuário. Isso pode falhar silenciosamente dependendo da ordem de execução das policies.

## Problema principal identificado — RACE CONDITION entre updatePositions e fetchChecklists

O `updatePositions` faz:
1. `setChecklists` com as novas posições (síncrono)
2. `supabase.upsert` (assíncrono)
3. Se houver erro, chama `fetchChecklists()` (assíncrono)

**PORÉM**, observe que `updatePositions` NÃO chama `fetchChecklists()` após sucesso do upsert! Então o estado local deve persistir.

**MAS** — há outro problema sutil: o `useEffect` no hook (linha 71-73):
```ts
useEffect(() => {
  fetchChecklists()
}, [fetchChecklists])
```

O `fetchChecklists` é um `useCallback` com dependência `[user, supabase]`. Se qualquer dessas dependências mudar, ele será recriado e o useEffect rodará novamente, fazendo `fetchChecklists()` que sobrescreve o estado local com dados do banco.

## Problema mais provável — O upsert no Supabase pode estar falhando silenciosamente

Se o `upsert` estiver falhando (por questões de RLS ou schema), o estado local é atualizado via `setChecklists`, mas o banco não recebe a nova posição. Na próxima vez que a página recarregar (ou se algum trigger causar um re-fetch), a ordem volta ao original.

## Segundos problema — Página do colaborador não foi corrigida

O arquivo `app/(collaborator)/colaborador/checklists/page.tsx` ainda ordena por `created_at`/`updated_at` nas linhas 121 e 126.
