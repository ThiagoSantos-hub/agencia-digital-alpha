# Análise — Card destino some durante drag-and-drop horizontal

## Problema
Quando arrasta um card para o lado, o card que está no lugar de destino "some" e depois "reaparece", em vez de deslizar suavemente para o lugar que o card arrastado vai ocupar.

## Causa raiz

O problema está no **DragOverlay** + na forma como o handleDragStart/handleDragEnd funciona:

1. **handleDragStart** (linha 63-65): apenas seta `activeId`
2. **handleDragEnd** (linha 67-79): apenas move no array com `arrayMove` e salva posição
3. **DragOverlay** (linha 288-309): renderiza o card ativo com `w-[350px]`

**O que acontece:**
- Quando começa o drag, o `activeId` é setado e o card original fica no DOM (com opacity 0.5 pelo Sortable)
- O `DragOverlay` cria uma cópia do card arrastado que segue o mouse
- Quando o drag termina, o `activeId` é setado para `null` → o DragOverlay some instantaneamente
- O `handleDragEnd` faz `arrayMove` que reordena o array → os cards no DOM mudam de posição instantaneamente (sem animação)
- O card destino "some" porque ele foi movido de lugar no DOM, e a transição é instantânea

**O problema real:** O `@dnd-kit` com `useSortable` no SortableChecklistCard tem uma `transition` no style:
```tsx
const style = {
  transform: CSS.Transform.toString(transform),
  transition,  // <-- essa transition é configurada pelo useSortable
  opacity: isDragging ? 0.5 : 1,
  zIndex: isDragging ? 10 : 0
}
```

Quando o drag termina, o `transform` muda de volta para `translate3d(0, 0, 0)` com a `transition`. MAS o problema é que o `arrayMove` no handleDragEnd reordena o array de dados, o que causa um **re-render** do SortableContext. Quando os cards são re-renderizados em posições diferentes, o `transform` que o useSortable aplica pode não ter uma transição suave entre as posições anteriores e as novas.

**Solução:** O `@dnd-kit` precisa da animação de reordenação. Isso é feito com o hook `useSortable` + a prop `animation` ou usando o `layoutAnimation` do DndContext.

A solução correta é adicionar `dropAnimation` personalizada ao DragOverlay OU usar o `useSortable` com a configuração de animação correta.

Porém, a solução mais simples e que funciona com o @dnd-kit é:
- Adicionar `layoutShift` animation — o @dnd-kit faz isso automaticamente quando o `DndContext` tem o sensor correto e o `SortableContext` usa a strategy correta.

Na verdade, o problema provavelmente é que o `overflow-hidden` que adicionamos no wrapper `w-[260px]` está cortando a animação de transição. Quando o card se move horizontalmente via `transform: translateX()`, o `overflow-hidden` do wrapper corta qualquer parte do card que saia dos 260px.

**MAS** — olhando melhor, o wrapper tem `overflow-hidden` apenas para cortar o painel de edição que vaza. Para o drag-and-drop, o `overflow-hidden` do wrapper pode estar cortando a animação de slide do card destino.

**SOLUÇÃO SIMPLES:** Remover o `overflow-hidden` do wrapper OU usar `overflow-x-visible` para o drag-and-drop.

Na verdade, a solução mais limpa é: o wrapper não precisa de `overflow-hidden` para o drag-and-drop funcionar. O `overflow-hidden` foi adicionado para conter o painel de edição, mas o painel de edição está agora contido pelo `max-w-[260px]` do card e pelo `overflow-hidden` do card raiz.

Portanto, **remover `overflow-hidden` dos wrappers** é a solução.
