# DESIGN-SYSTEM.md — Agência Digital Alpha

> Guia visual completo do projeto. Qualquer componente novo deve seguir rigorosamente este documento.

---

## 🎨 Cores

> **Referência visual:** Light Mode inspirado no [Reportei](https://app.reportei.com) — decisão tomada em 11/07/2026.
> Paleta: azul royal `#1A56DB` + verde CTA `#16A34A` + fundo branco/cinza claro.

Todas as cores vêm de `tailwind.config.ts`. **Nunca use valores hexadecimais hardcoded fora dos tokens abaixo.** Nunca use classes do tema escuro/neon anterior (ex: `bg-gray-950`, `#00ff88`, `#0a0f0c`, `#1a3a24`).

### Paleta Completa (Light Mode)

| Token / Uso | Hex | Aplicação |
|---|---|---|
| **Background principal** | `#F8FAFC` | Fundo de todas as páginas (`body`, `<main>`) |
| **Sidebar background** | `#FFFFFF` | Fundo da sidebar |
| **Sidebar border** | `#E2E8F0` | Borda direita da sidebar (`border-r`) |
| **Header background** | `#FFFFFF` | Fundo do header/topbar |
| **Header border** | `#E2E8F0` | Borda inferior do header (`border-b`) |
| **Card background** | `#FFFFFF` | Fundo de cards e painéis |
| **Card border** | `#E2E8F0` | Borda dos cards |
| **Primário (azul)** | `#1A56DB` | Links ativos, botões primários, destaque, foco |
| **Primário hover** | `#1E40AF` | Hover do botão primário |
| **CTA verde** | `#16A34A` | Botão de ação principal (salvar, confirmar, criar) |
| **CTA verde hover** | `#15803D` | Hover do CTA verde |
| **Texto principal** | `#1E293B` | Títulos e textos importantes |
| **Texto secundário** | `#64748B` | Labels, subtítulos, placeholders |
| **Texto desabilitado** | `#94A3B8` | Itens inativos, labels de grupo sidebar |
| **Sucesso** | `#22C55E` | Checkmarks, badges de sucesso |
| **Erro** | `#EF4444` | Ícones de negação, badges de erro |
| **Aviso** | `#F59E0B` | Badges de alerta |
| **Ativo sidebar bg** | `#EFF6FF` | Background do item ativo na sidebar |
| **Ativo sidebar texto** | `#1A56DB` | Texto do item ativo na sidebar |
| **Ativo sidebar border** | `#BFDBFE` | Borda do item ativo na sidebar |
| **Hover sidebar** | `#F1F5F9` | Hover dos itens da sidebar e rows de tabela |

### Tailwind Config (completo)

```ts
// tailwind.config.ts
colors: {
  background:        '#F8FAFC',
  surface:           '#FFFFFF',
  border:            '#E2E8F0',
  primary:           '#1A56DB',
  'primary-hover':   '#1E40AF',
  cta:               '#16A34A',
  'cta-hover':       '#15803D',
  'text-main':       '#1E293B',
  'text-muted':      '#64748B',
  'text-disabled':   '#94A3B8',
  'active-bg':       '#EFF6FF',
  'active-border':   '#BFDBFE',
  'hover-bg':        '#F1F5F9',
}
```

### Cores Semânticas (inline, fora do config)

| Uso | Classe Tailwind |
|---|---|
| Erro / Danger / Prioridade urgente | `text-red-500`, `bg-red-50`, `border-red-200` |
| Aviso / Prioridade média | `text-amber-600`, `bg-amber-50`, `border-amber-200` |
| Sucesso / Prioridade baixa | `text-green-600`, `bg-green-50`, `border-green-200` |
| Botão sair / Ação destrutiva | `text-red-500 hover:text-red-600 hover:bg-red-50` |
| Fundo overlay modal | `bg-black/40` |
| Spinner | `border-t-2 border-[#1A56DB]` |
| Avatar usuário | `bg-[#EFF6FF] border border-[#BFDBFE]`, inicial em `text-[#1A56DB]` |

### ❌ Cores proibidas (tema escuro legado)

Nunca usar estas classes — pertencem ao tema dark anterior que foi removido:

```
bg-gray-950  bg-gray-900  bg-gray-800  bg-[#0a0f0c]  bg-[#0f1f14]
bg-[#1a1a1a]  bg-[#0f0f0f]  text-[#00ff88]  border-[#2a2a2a]
text-emerald-400  text-emerald-500  bg-[#1a3a24]
```

```tsx
// ✅ Correto
<div className="bg-surface border border-border text-text-main">

// ❌ Errado — hardcode direto
<div className="bg-white border border-slate-200 text-slate-900">
```

---

## ✍️ Tipografia

O projeto usa a fonte padrão do sistema (Tailwind default — Inter/system-ui).

| Uso | Classes |
|---|---|
| Título de seção (h2 modal) | `text-base font-semibold text-text-main` |
| Título de card (h3) | `text-sm font-semibold text-text-main` |
| Label de campo | `text-sm font-medium text-text-muted` |
| Corpo de texto | `text-sm text-text-main` |
| Texto secundário | `text-sm text-text-muted` |
| Texto auxiliar / hint | `text-xs text-text-muted` |
| Label de erro | `text-xs text-red-500` |
| Cabeçalho de tabela | `text-xs font-semibold text-text-muted uppercase tracking-wider` |
| Logo "DIGITAL" | `font-black text-lg tracking-tight text-text-main` |
| Logo "ALPHA" | `font-black text-lg tracking-tight text-primary` |
| Label de grupo sidebar | `text-[10px] font-semibold text-text-muted uppercase tracking-wider` |

---

## 📐 Espaçamentos

O projeto usa escala padrão do Tailwind (base 4px).

| Token | Valor | Uso típico |
|---|---|---|
| `p-3` / `py-2.5 px-3` | 12px | Itens de sidebar, inputs sm |
| `p-4` | 16px | Card padding sm, células de tabela |
| `p-5` | 20px | Card padding md (padrão) |
| `p-6` | 24px | Card padding lg, header/footer de modal |
| `gap-1.5` | 6px | Gap entre ícone e texto em botão sm |
| `gap-2` | 8px | Gap entre ícone e texto em botão md/lg |
| `gap-3` | 12px | Gap entre ícones na sidebar |
| `mb-4` | 16px | Espaço após `CardHeader` |
| `space-y-4` | 16px | Espaço entre grupos da sidebar |

---

## 🔵 Border Radius

| Elemento | Classe |
|---|---|
| Botões | `rounded-lg` (8px) |
| Inputs | `rounded-lg` (8px) |
| Cards | `rounded-xl` (12px) |
| Modais | `rounded-xl` (12px) |
| Tabelas | `rounded-xl` (12px) |
| Sidebar | sem arredondamento (fixa full-height) |
| Badges de prioridade | `rounded-full` |
| Scrollbar thumb | `border-radius: 3px` (global.css) |

---

## 🌑 Sombras

| Elemento | Classe |
|---|---|
| Card (repouso) | `shadow-sm` |
| Card (hover) | `shadow-md` (via `hover:shadow-md transition-shadow`) |
| Modal | `shadow-lg` |
| Sidebar | sem sombra (usa borda `border-r`) |

---

## 📏 Grid e Layout

### Shell Principal (gestor)

```
┌─────────────────────────────────────────────┐
│  Sidebar (w-64, fixo, h-screen)             │
│  ├── Logo                                   │
│  ├── Nav grupos                             │
│  └── Footer (perfil + logout)               │
├────────────────────────────────────────────┤
│  Conteúdo (ml-64, flex-col)                │
│  ├── Header (h-14, fixo no topo)           │
│  └── <main> (flex-1, overflow-y-auto, p-6) │
└─────────────────────────────────────────────┘
```

- **Sidebar**: `w-64` (256px), `fixed left-0 top-0 h-screen`
- **Conteúdo**: `ml-64`, `flex-1 flex-col`
- **Main**: `p-6`, `overflow-y-auto`

### Grids de Página

Não há um grid system rígido — use Tailwind flexbox/grid conforme o conteúdo:

```tsx
// Cards em grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Dois painéis lado a lado
<div className="flex gap-6">

// Lista vertical com espaço
<div className="flex flex-col gap-4">
```

---

## 📱 Breakpoints

Tailwind padrão (mobile-first):

| Breakpoint | Largura | Uso no projeto |
|---|---|---|
| `sm` | 640px | Raramente usado |
| `md` | 768px | Grid 2 colunas |
| `lg` | 1024px | Grid 3 colunas |
| `xl` | 1280px | Layouts expandidos |

> O projeto é primariamente **desktop-first** — a sidebar fixa de 256px já impõe um mínimo de ~768px para uso confortável.

---

## 🔘 Botões

Componente: `components/ui/Button.tsx`

### Variantes

```tsx
// Ação principal (azul)
<Button variant="primary">Salvar</Button>

// Ação de destaque (verde) — criar, confirmar
<Button variant="cta">Criar Cliente</Button>

// Ação secundária (outline azul)
<Button variant="secondary">Cancelar</Button>

// Ação sutil (sem fundo)
<Button variant="ghost">Ver mais</Button>

// Ação destrutiva (vermelho)
<Button variant="danger">Excluir</Button>
```

### Tamanhos

```tsx
<Button size="sm">Pequeno</Button>   // px-3 py-1.5 text-xs
<Button size="md">Médio</Button>     // px-4 py-2 text-sm (padrão)
<Button size="lg">Grande</Button>    // px-5 py-2.5 text-sm
```

### Estados

```tsx
// Loading — exibe spinner, desabilita automaticamente
<Button loading>Salvando...</Button>

// Disabled
<Button disabled>Indisponível</Button>

// Com ícone
<Button icon={<Plus size={14} />}>Adicionar</Button>
```

### Estilos por variante

| Variante | Fundo | Texto | Hover |
|---|---|---|---|
| `primary` | `#1A56DB` | branco | `#1E40AF` |
| `cta` | `#16A34A` | branco | `#15803D` |
| `secondary` | branco | `#1A56DB` | `#EFF6FF` |
| `ghost` | transparente | `#64748B` | `#F1F5F9` + `#1E293B` |
| `danger` | `red-500` | branco | `red-600` |

Todos: `disabled:opacity-50 disabled:cursor-not-allowed`

---

## 🔲 Inputs

Componente: `components/ui/Input.tsx`

```tsx
// Básico
<Input label="Nome do cliente" placeholder="Ex: João Silva" />

// Com ícone
<Input label="Buscar" icon={<Search size={16} />} placeholder="Pesquisar..." />

// Com erro
<Input label="Email" error="Email inválido" />

// Com hint
<Input label="Slug" hint="Usado na URL pública" />

// Desabilitado
<Input label="ID" disabled value="abc-123" />
```

### Especificações

- Borda padrão: `border-[#E2E8F0]`
- Foco: `border-[#1A56DB] ring-1 ring-[#1A56DB]`
- Erro: `border-red-500 ring-red-500`
- Placeholder: `#94A3B8`
- Padding: `py-2 px-3` (sem ícone) | `py-2 pl-10 pr-4` (com ícone)
- Ícone posicionado: `absolute left-3.5`, centralizado verticalmente

---

## 🃏 Cards

Componente: `components/ui/Card.tsx`

```tsx
// Card simples
<Card>
  Conteúdo aqui
</Card>

// Com padding personalizado
<Card padding="lg">Conteúdo espaçoso</Card>

// Com header
<Card>
  <CardHeader
    title="Clientes ativos"
    description="Total de clientes com status ativo"
    action={<Button size="sm">Ver todos</Button>}
  />
  {/* conteúdo */}
</Card>
```

### Especificações

- Fundo: `bg-white`
- Borda: `border border-[#E2E8F0]`
- Raio: `rounded-xl`
- Sombra: `shadow-sm hover:shadow-md transition-shadow`
- Padding sm: `p-4` | md: `p-5` (padrão) | lg: `p-6`

---

## 🪟 Modais

Componente: `components/ui/Modal.tsx`

```tsx
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Editar cliente"
  description="Atualize os dados do cliente abaixo."
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
      <Button variant="primary" onClick={handleSave}>Salvar</Button>
    </>
  }
>
  {/* formulário aqui */}
</Modal>
```

### Especificações

- Overlay: `bg-black/40`, fecha ao clicar
- Fecha com `ESC` automaticamente
- Scroll interno: `overflow-y-auto` no body do modal
- Altura máxima: `max-h-[90vh]`
- Tamanhos: `sm` = `max-w-sm` | `md` = `max-w-lg` (padrão) | `lg` = `max-w-2xl`
- Footer: botões alinhados à direita com `gap-3`
- `z-index`: `z-50`

---

## 📊 Tabelas

Componente: `components/ui/Table.tsx`

```tsx
const columns = [
  { key: 'name', header: 'Nome' },
  { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
  { key: 'actions', header: '', render: (row) => <Button size="sm">Editar</Button> },
]

<Table
  columns={columns}
  data={clientes}
  keyExtractor={(row) => row.id}
  loading={loading}
  onRowClick={(row) => router.push(`/clientes/${row.id}`)}
  empty={<span>Nenhum cliente cadastrado.</span>}
/>
```

### Especificações

- Container: `rounded-xl border border-[#E2E8F0] overflow-x-auto`
- Header: `bg-[#F8FAFC]`, `text-xs font-semibold text-[#64748B] uppercase tracking-wider`
- Linha: `border-b border-[#E2E8F0]`, `hover:bg-[#F8FAFC]` (quando clicável)
- Célula: `px-4 py-3 text-sm text-[#1E293B]`
- Estado vazio: centralizado, `text-[#64748B] text-sm`
- Estado loading: centralizado, `text-[#64748B] text-sm`

---

## 🏷️ Badges de Status e Prioridade

Não há um componente `Badge` centralizado — use o padrão inline:

```tsx
// Prioridade urgente / alta
<span className="text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full text-xs">
  Urgente
</span>

// Prioridade média
<span className="text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full text-xs">
  Média
</span>

// Prioridade baixa / sucesso
<span className="text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full text-xs">
  Baixa
</span>

// Status ativo (azul)
<span className="text-[#1A56DB] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded-full text-xs">
  Ativo
</span>
```

---

## 🔄 Estados Interativos

### Hover

| Elemento | Estado normal | Hover |
|---|---|---|
| Item sidebar | `text-text-muted` | `text-text-main bg-hover-bg` |
| Item sidebar ativo | `text-primary bg-active-bg border-active-border` | mantém |
| Row de tabela | `bg-white` | `bg-[#F8FAFC]` |
| Card | `shadow-sm` | `shadow-md` |
| Botão ghost | `transparent` | `bg-hover-bg text-text-main` |

### Active (sidebar)

```tsx
// Item ativo
className="bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]"

// Item inativo
className="text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]"
```

### Disabled

Todos os elementos interativos desabilitados usam:
```tsx
disabled:opacity-50 disabled:cursor-not-allowed
```

### Focus (inputs)

```tsx
focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB]
```

### Loading

Spinner padrão:
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#1A56DB]" />
```

Botão com loading:
```tsx
<Button loading>Salvando...</Button>
// Internamente usa: <Loader2 size={14} className="animate-spin" />
```

---

## 🖼️ Ícones

Biblioteca: `lucide-react` (já instalada, versão `0.383.0`)

```tsx
import { Plus, Trash2, Edit, Search, X, Check } from 'lucide-react'

// Tamanhos padrão por contexto
<Icon size={14} />   // dentro de botões sm
<Icon size={16} />   // dentro de inputs, badges
<Icon size={18} />   // sidebar, header
<Icon size={20} />   // ícones standalone maiores
```

### Ícones em uso no projeto

| Ícone | Uso |
|---|---|
| `LayoutDashboard` | Dashboard |
| `Users` | Clientes |
| `Megaphone` | Campanhas |
| `BarChart2` | Relatórios |
| `Bell` | Alertas / Notificações |
| `CheckSquare` | Tarefas |
| `List` | Checklists |
| `Wallet` | Financeiro |
| `UserCog` | Colaboradores |
| `Bot` | Alpha AI |
| `Plug` | Integrações |
| `Sparkles` | Novidades |
| `MessageSquare` | Feedbacks |
| `UserCircle` | Perfil |
| `LogOut` | Sair |
| `X` | Fechar modal |
| `Loader2` | Spinner de loading |
| `Calendar` | Datas |
| `Edit` | Editar |
| `Trash2` | Excluir |
| `Copy` | Duplicar |

---

## 📜 Scrollbar Customizada

Definida em `globals.css`, aplicada globalmente:

```css
::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #F1F5F9; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #1A56DB; }
```

Para aplicar em um elemento específico com scroll:
```tsx
<div className="overflow-y-auto custom-scrollbar">
```

---

## ➕ Como Criar Novos Componentes

### Checklist de consistência visual

Antes de entregar qualquer componente novo, valide:

- [ ] Usa apenas tokens de cor de `tailwind.config.ts` (sem hex hardcoded)
- [ ] Border radius correto: `rounded-lg` para elementos pequenos, `rounded-xl` para containers
- [ ] Sombra correta: `shadow-sm` + `hover:shadow-md` para cards
- [ ] Tipografia correta: `text-sm` para corpo, `text-xs` para auxiliar
- [ ] Estado hover definido
- [ ] Estado disabled definido (`disabled:opacity-50 disabled:cursor-not-allowed`)
- [ ] Estado loading definido (se aplicável)
- [ ] Ícones de `lucide-react` com tamanho adequado ao contexto
- [ ] Export como **named export** (não default)
- [ ] Props tipadas com `interface`

### Template de componente

```tsx
// components/[dominio]/NomeComponente.tsx

interface NomeComponenteProps {
  // props aqui
  className?: string
}

export function NomeComponente({ className = '' }: NomeComponenteProps) {
  return (
    <div className={`
      bg-surface border border-border rounded-xl shadow-sm
      hover:shadow-md transition-shadow p-5
      ${className}
    `}>
      {/* conteúdo */}
    </div>
  )
}
```

### Regras de ouro

1. **Nunca crie um componente que acesse o Supabase diretamente** — use hooks
2. **Nunca use cores fora da paleta** — se precisar de uma cor nova, adicione ao `tailwind.config.ts`
3. **Prefira compor componentes existentes** a criar novos do zero
4. **Mantenha os componentes de UI sem lógica de negócio** — apenas renderização e eventos
5. **Textos sempre em português brasileiro** na UI

---

*Gerado a partir do código-fonte real — reflita qualquer mudança visual aqui antes de implementar.*
