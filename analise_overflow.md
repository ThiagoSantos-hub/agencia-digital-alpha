# Análise Pente-Fino — Overflow no Modo de Edição

## Problema reportado
Quando o usuário clica no ícone de lápis para editar, o painel de edição "vaza" para fora do card, ultrapassando o container de 260px.

## Estado atual do código (após correção anterior)

### Container do card (linha 108-116)
```tsx
<div 
  ref={setNodeRef}
  style={style}
  className={`bg-[#111] border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${...}`}
>
```
→ Tem `overflow-hidden`, mas o container wrapper é `w-[260px] shrink-0`

### Inner container (linha 124)
```tsx
<div className="p-3 flex-1 flex flex-col min-h-[300px]">
```
→ `p-3` = 12px de padding em cada lado (24px total horizontal)
→ `min-h-[300px]` = altura mínima de 300px
→ `flex-1` = ocupa todo o espaço restante

### Header com botões (linha 125)
```tsx
<div className="flex justify-between items-start mb-2">
```
→ Grip (14px) + padding (4px) = ~22px
→ Ícones edit/delete (12px) + padding (4px) cada = ~40px
→ Total header: ~62px + `gap-0.5` + `mb-2` = espaço razoável

### Painel de edição (linha 144-181)
```tsx
<div className="space-y-2 mb-3 bg-[#0a0f0c] p-2 rounded-xl border border-[#00ff88]/20 overflow-hidden">
```
→ `p-2` = 8px padding cada lado (16px total)
→ Dentro do container com `p-3` (24px total), total padding interno = 24 + 16 = 40px de cada lado
→ Container: 260px - 40px = 220px de espaço útil

→ Input de texto: `w-full` = 220px — OK
→ Botões de dias: 7 x (w-5=20px + gap-0.5=2px) = 7*22 - 2 = 152px — OK para 220px
→ Botões Salvar/Sair: `flex-1` cada — OK

## Análise profunda — O que pode estar causando o overflow?

### PROBLEMA A — O estado `title` no useState (linha 60)
```tsx
const [title, setTitle] = useState(list.title)
```
O `title` é inicializado com `list.title`. Se o título do checklist for muito longo, o input vai tentar exibir todo o texto. Embora tenha `truncate`, o `truncate` do Tailwind usa `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` — mas o container do input ainda tem `w-full`. Se o texto for muito longo e o `truncate` não estiver funcionando corretamente dentro do `overflow-hidden` do container pai, o conteúdo pode transbordar.

**Porém, o problema relatado mostra "sdsdsd" como título (muito curto), então não é isso.**

### PROBLEMA B — O `style` do useSortable pode estar causando overflow
```tsx
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  zIndex: isDragging ? 10 : 0
}
```
→ Esse style é aplicado ao div raiz do card. Ele contém `transform`. Se o `transform` contiver uma translação X/Y (mesmo que 0), isso pode afetar o layout em alguns navegadores, causando overflow visual.

### PROBLEMA C — O `transition-all duration-300` pode estar causando transição de largura
A classe `transition-all` no container raiz (linha 111) aplica transição a TODAS as propriedades, incluindo `width`, `min-width`, `max-width`. Se houver alguma mudança de estado que cause o card a tentar expandir, a transição pode fazer o conteúdo "vazar" temporariamente.

### PROBLEMA D — O container wrapper na página (w-[260px] shrink-0)
```tsx
<div key={list.id} className="w-[260px] shrink-0">
  <SortableChecklistCard ... />
</div>
```
→ O wrapper tem `shrink-0`, o que impede o card de encolher. Mas se o card tiver conteúdo que excede 260px, o `overflow-hidden` do card deveria cortá-lo.

**MAS** — o `overflow-hidden` está no card interno (o div com `bg-[#111]`), não no wrapper. Se o `transform` do `useSortable` causar o card a sair do fluxo normal, o `overflow-hidden` pode não funcionar corretamente.

### PROBLEMA E — O `min-h-[300px]` no inner container
Quando no modo de edição, o painel de edição é maior que o título normal. Se o card não tiver altura suficiente para acomodar tudo, e o container tiver `overflow-y` implícito (que não existe), o conteúdo pode transbordar.

Porém o problema relatado é de **largura** (passa do painel), não de altura.

### PROBLEMA F — O DndContext interno para os itens
Dentro do SortableChecklistCard, há um `DndContext` separado (linha 216) para arrastar os itens. Esse DndContext pode estar interferindo no layout do card pai, especialmente se o `transform` do sortable estiver aplicado de forma inesperada.

### PROBLEMA G — O `title` state pode ficar dessincronizado
O `useState(list.title)` é inicializado uma vez. Se o `list.title` mudar (por exemplo, após `updateChecklist`), o estado local `title` NÃO é atualizado automaticamente. Isso não causa overflow diretamente, mas é uma inconsistência.

## HIPÓTESE PRINCIPAL

Olhando a imagem do usuário: o input de edição mostra "fdgfdgfg" e o painel de edição claramente ultrapassa o card para a direita. O container de edição tem:
- `bg-[#0a0f0c]` com `border border-[#00ff88]/20`
- `rounded-xl`

O problema é que o container de edição está **dentro** do inner container com `p-3`, e o container de edição tem seu próprio `p-2`. O conteúdo dentro (input + botões de dias + botões salvar/sair) está tudo em `w-full` ou `flex-1`, então teoricamente deveria caber.

**MAS** — o problema pode ser que o `flex flex-col` do inner container (linha 124) está permitindo que o conteúdo se expanda horizontalmente além do card, porque `flex` com `flex-col` não restringe a largura dos filhos automaticamente.

A classe `overflow-hidden` está no card raiz (linha 111), mas o `style` com `transform` pode estar anulando o efeito do `overflow-hidden` — isso é um comportamento conhecido: quando um elemento tem `transform` (mesmo que não faça nada), ele cria um novo contexto de empilhamento e pode fazer com que `overflow: hidden` não corte o conteúdo corretamente em alguns casos.
