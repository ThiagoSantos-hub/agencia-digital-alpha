# Análise Pente-Fino Final — Overflow no Modo de Edição

## Causa Raiz Identificada

O problema não está no painel de edição do TÍTULO do checklist (que já foi reduzido).
O problema está no **modo de edição dos ITENS individuais** dentro de cada card.

### Evidências:

1. **SortableChecklistItem.tsx** — linha 76-86 (modo de edição do item):
```tsx
<div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
  <input
    className="flex-1 bg-[#111] border border-[#00ff88]/40 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
  />
</div>
```

O input de edição do item tem:
- `px-3` = 24px de padding horizontal (12px cada lado)
- `text-sm` = 14px de fonte (grande demais para o card de 260px)
- `flex-1` = expande para ocupar todo o espaço
- NO `truncate` ou `min-w-0`

2. **O container do item** (linha 48-55):
```tsx
<div className="group flex items-center gap-3 p-3 rounded-xl border transition-all">
```
- `p-3` = 24px de padding cada lado (48px total horizontal)
- `gap-3` = 12px entre os elementos internos
- Grip icon: ~24px
- Checkbox: ~20px
- gap-3 entre grip e checkbox: 12px
- gap-3 entre checkbox e texto: 12px
- Botões de ação (edit/delete): ~56px + gap-1 (4px) = 60px

**Cálculo de espaço:**
- Container: 260px - 48px (padding) = 212px útil
- Grip: 24px
- Checkbox: 20px
- Gaps: 12px + 12px = 24px
- Botões de ação: 60px
- Sobra para texto/input: 212 - 24 - 20 - 24 - 60 = 84px

O input de edição tem `px-3` (24px) + texto + `flex-1`. Se o texto digitado for longo, o input expande e ultrapassa os 84px disponíveis.

3. **Além disso**, o container do item tem `flex items-center` mas NÃO tem `overflow-hidden` ou `min-w-0`, o que significa que o conteúdo flex pode expandir indefinidamente para a direita.

## Conclusão

O problema de overflow NÃO é no painel de edição do título do checklist (que já corrigimos).
O problema está nos **inputs de edição dos itens individuais** dentro do card.

Porém, olhando a imagem do usuário novamente — ela mostra claramente o painel de edição do TÍTULO (com os botões de dias D/S/T/Q/Q/S/S e os botões Salvar/Sair). Então o problema PODE ser que:

1. O `overflow-hidden` no card raiz não está funcionando porque o `style` do `useSortable` (com `transform`) anula o `overflow: hidden` em navegadores Chrome/Edge.
2. O `transition-all` pode estar causando o card a expandir temporariamente.
3. O `flex flex-col` sem `min-w-0` ou `w-full` explícito pode estar permitindo que o conteúdo filho exceda a largura.

## A verdadeira causa: CSS Layout

O card tem `flex flex-col` (linha 124: `p-3 flex-1 flex flex-col`). Em flexbox, um filho de `flex-col` NÃO restringe sua largura automaticamente. Se um filho direto (como o painel de edição) tiver conteúdo que exceda a largura do pai, ele vai expandir.

O container wrapper tem `w-[260px] shrink-0`, mas o card filho com `flex-1` pode não estar respeitando essa largura porque:
- `flex-1` = `flex: 1 1 0%` — o basis é 0%, mas o conteúdo pode expandir se não houver restrição.
- O card tem `overflow-hidden`, mas o `style` com `transform` pode criar um novo stacking context que anula o overflow clipping.

**Solução: Adicionar `w-full max-w-[260px]` ao card raiz E adicionar `overflow-hidden` com `min-w-0` ao inner container.**
