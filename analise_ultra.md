# Análise Ultra-Profunda — Overflow Modo de Edição (v2)

## Calibração de pixels

### Container wrapper na página:
`w-[260px] shrink-0 overflow-hidden`

### Card raiz (div 1):
- `bg-[#111] border rounded-2xl overflow-hidden transition-transform duration-300 flex flex-col w-full max-w-[260px]`
- `style={style}` com `transform: CSS.Transform.toString(transform)`
- O `transform` do useSortable pode ser `translate3d(x, y, 0)` mesmo quando não está arrastando
- `border` = 1px em cada lado = 2px total horizontal
- `rounded-2xl` = border-radius de 16px
- `w-full max-w-[260px]` — mas o wrapper já é 260px, então o card ocupa os 260px completos (menos 2px de border = 258px interno)

### Inner container (div 2):
- `p-3 flex-1 flex flex-col min-h-[300px] min-w-0 overflow-hidden`
- `p-3` = 12px padding cada lado
- Espaço interno: 258px - 24px = 234px

### Header (div 3):
- `flex justify-between items-start mb-2`
- Grip: 14px icon + 4px padding = ~22px
- Edit/Delete: 12px icon + 4px padding cada = ~40px
- `gap-0.5` = 2px entre edit/delete
- Espaço restante: 234px - 64px = 170px (ok, não é o problema)

### Painel de edição (div 4):
- `space-y-2 mb-3 bg-[#0a0f0c] p-2 rounded-xl border border-[#00ff88]/20 overflow-hidden max-w-[220px]`
- `p-2` = 8px padding cada lado
- `border` = 1px cada lado
- `max-w-[220px]` — RESTRIÇÃO EXPLÍCITA
- Espaço interno do painel: 220px - 16px (padding) - 2px (border) = 202px

**CÁLCULO:** O painel de edição tem `max-w-[220px]`, o inner container tem `min-w-0 overflow-hidden`, o card raiz tem `max-w-[260px] overflow-hidden`, e o wrapper tem `overflow-hidden`. 

**Tudo deveria estar contido. Se continua vazando, o problema NÃO está no CSS do card.**

## HIPÓTESES RESTANTES

### Hipótese A — O DragOverlay na página
Na página principal (linha 288-309), há um `DragOverlay`:
```tsx
<DragOverlay dropAnimation={{
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.5' },
    },
  }),
}}>
  {activeList ? (
    <div className="w-[350px]">
      <SortableChecklistCard list={activeList} ... />
    </div>
  ) : null}
</DragOverlay>
```

O `DragOverlay` tem `w-[350px]` — 90px a mais que o wrapper de 260px! Se o DragOverlay estiver sendo renderizado de alguma forma quando o usuário clica em editar (embora não deveria ser), isso poderia causar o overflow.

Porém, o DragOverlay só aparece quando `activeId` está definido (ou seja, durante drag-and-drop).

### Hipótese B — O problema pode ser o SortableChecklistItem
Quando o usuário diz "vaza na hora que vai editar", talvez ele esteja se referindo ao modo de edição do ITEM (não do título do checklist). O SortableChecklistItem tem:
```tsx
<div className="group flex items-center gap-3 p-3 rounded-xl border transition-all">
```
O input de edição do item (linha 77-86):
```tsx
<div className="flex-1 flex gap-2">
  <input className="flex-1 bg-[#111] border border-[#00ff88]/40 rounded-lg px-3 py-1 text-sm" />
</div>
```

O item não tem `overflow-hidden` no container, e o input não tem `truncate`. Se o texto do item for longo, o input expande e vaza.

### Hipótese C — O `style` com transform está causando overflow NO DRAG
Quando o card NÃO está sendo arrastado, o `transform` pode ser `translate3d(0, 0, 0)` — que não causa overflow. MAS o `transition` no style pode estar causando uma animação de translação mesmo sem drag.

### Hipótese D — O problema real: O border do card não está incluído no cálculo
`w-full` no card raiz dentro de `w-[260px]`. O card tem `border` (1px cada lado = 2px). Se o card é `w-full` (260px) + `border` (2px), o total é 262px — ultrapassando o wrapper de 260px!

Isso é o problema mais provável! O `box-sizing` padrão é `border-box`, então `border` DEVERIA estar incluído. MAS se o Tailwind configurou `box-sizing: content-box` ou se há alguma override, o border seria ADICIONAL ao width.

### Hipótese E — O `flex` no wrapper
O wrapper `w-[260px] shrink-0` está dentro de:
```tsx
<div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
```
O `flex` do container pai + `gap-4` (16px) pode estar causando comportamento estranho. Cada card tem 260px + 16px de gap = 276px efetivos por card.

## VERIFICAÇÃO CRUCIAL
Preciso verificar se o `box-sizing` está correto e se o border está sendo incluído no cálculo de largura.
