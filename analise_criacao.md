# Análise — Painel de criação de lista muito grande

## Estrutura atual do painel de criação (linha 159-239)

### Container principal:
- `mb-10 bg-[#111] border border-[#2a2a2a] rounded-2xl p-6`
- `p-6` = 24px padding em cada lado
- `mb-10` = 40px margin-bottom

### Grid:
- `grid grid-cols-1 lg:grid-cols-2 gap-12`
- `gap-12` = 48px entre as colunas (MUITO grande!)
- `lg:grid-cols-2` = 2 colunas em telas grandes (cada coluna ocupa ~50% da tela)
- `p-6` + `gap-12` + 2 colunas = painel ocupando quase toda a largura da tela

### Lado esquerdo (linha 167-198):
- `space-y-8` = 32px entre elementos
- Input de título: `px-6 py-4` = padding grande
- Botões de dias: `aspect-square` = quadrados grandes + `gap-2`

### Lado direito (linha 200-226):
- `space-y-6` = 24px entre elementos
- Input de tarefa: `px-6 py-4` = padding grande
- Lista de tarefas: `max-h-48` = 192px max height

### Problema principal:
O painel usa `lg:grid-cols-2` que divide a tela inteira em 2 colunas, e com `gap-12` (48px) entre elas. Isso faz o painel ocupar a tela inteira em largura.

## Solução:
1. Reduzir `gap-12` para `gap-6` ou `gap-4`
2. Reduzir `p-6` para `p-4` no container
3. Reduzir `mb-10` para `mb-6`
4. Reduzir `space-y-8` para `space-y-4` no lado esquerdo
5. Reduzir `space-y-6` para `space-y-4` no lado direito
6. Reduzir padding dos inputs de `px-6 py-4` para `px-4 py-3`
7. Reduzir input de título font-size de `text-sm` para `text-xs`
8. Reduzir botões de dias de `aspect-square` (quadrados grandes) para tamanho fixo menor
9. Reduzir `max-h-48` para `max-h-36` na lista de tarefas
