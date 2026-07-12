# COMPONENTS.md — Agência Digital Alpha

> Catálogo completo de todos os componentes do projeto. Consulte antes de criar qualquer coisa nova — o componente que você precisa provavelmente já existe.

---

## Índice

- [UI Base](#-ui-base) — Button, Card, CardHeader, Input, Modal, Table
- [Layout](#-layout) — Sidebar, Header, CollaboratorSidebar, CollaboratorHeader, NotificationBell, NotificationSound
- [IA (Alpha)](#-ia-alpha) — AlphaWidget, AlphaVoiceButton, AlphaChatPanel, AlphaChatInput, AlphaChatMessage, AlphaToolBadge
- [Tarefas](#-tarefas) — KanbanColumn, TaskCard
- [Checklists](#-checklists) — SortableChecklistCard, SortableChecklistItem
- [WhatsApp](#-whatsapp) — WhatsAppConnect
- [Padrões de nomenclatura](#-padrões-de-nomenclatura)

---

## 🧱 UI Base

> Componentes primitivos do design system. Exportados em `components/ui/index.ts`.

---

### `Button`

**Arquivo:** `components/ui/Button.tsx`

**Objetivo:** Botão reutilizável com variantes visuais, tamanhos, estado de loading e suporte a ícone.

**Quando usar:** Toda ação interativa do usuário — salvar, cancelar, excluir, criar, navegar.

**Quando NÃO usar:** Links de navegação entre páginas (use `<Link>` do Next.js). Ações meramente visuais sem callback.

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `variant` | `'primary' \| 'cta' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamanho |
| `loading` | `boolean` | `false` | Exibe spinner e desabilita o botão |
| `icon` | `ReactNode` | — | Ícone exibido à esquerda do texto |
| `disabled` | `boolean` | `false` | Desabilita o botão |
| `children` | `ReactNode` | obrigatório | Texto ou conteúdo do botão |
| `...props` | `ButtonHTMLAttributes` | — | Qualquer prop nativa de `<button>` |

**Exemplos:**

```tsx
<Button variant="primary">Salvar</Button>
<Button variant="cta" icon={<Plus size={14} />}>Criar Cliente</Button>
<Button variant="secondary" onClick={onClose}>Cancelar</Button>
<Button variant="ghost" size="sm">Ver mais</Button>
<Button variant="danger" loading={deleting}>Excluir</Button>
```

**Componentes relacionados:** `Modal` (usa Button no footer), `Input` (frequentemente aparecem juntos em formulários)

---

### `Card`

**Arquivo:** `components/ui/Card.tsx`

**Objetivo:** Container visual padrão para agrupar conteúdo relacionado.

**Quando usar:** Sempre que precisar de um bloco de conteúdo com fundo branco, borda e sombra suave.

**Quando NÃO usar:** Itens de lista simples sem necessidade de destaque visual. Conteúdo inline no meio de texto.

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `children` | `ReactNode` | obrigatório | Conteúdo interno |
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding interno (`p-4`, `p-5`, `p-6`) |
| `className` | `string` | `''` | Classes extras para sobrescrever ou estender |

**Exemplos:**

```tsx
<Card>
  <p>Conteúdo simples</p>
</Card>

<Card padding="lg" className="col-span-2">
  <CardHeader title="Clientes ativos" description="Este mês" action={<Button size="sm">Ver todos</Button>} />
  {/* conteúdo */}
</Card>
```

**Componentes relacionados:** `CardHeader` (subcomponente do mesmo arquivo)

---

### `CardHeader`

**Arquivo:** `components/ui/Card.tsx` (exportado do mesmo arquivo)

**Objetivo:** Cabeçalho padronizado para cards — título, descrição opcional e ação opcional.

**Quando usar:** Dentro de `<Card>` quando o card precisa de título e/ou ação no topo.

**Quando NÃO usar:** Fora de `<Card>`. Para títulos de seção de página (use `<h2>` direto).

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | obrigatório | Título do card |
| `description` | `string` | — | Subtítulo opcional |
| `action` | `ReactNode` | — | Elemento à direita (ex: botão, badge) |

**Exemplo:**

```tsx
<Card>
  <CardHeader
    title="Resumo financeiro"
    description="Julho 2026"
    action={<Button size="sm" variant="ghost">Exportar</Button>}
  />
  {/* conteúdo do card */}
</Card>
```

---

### `Input`

**Arquivo:** `components/ui/Input.tsx`

**Objetivo:** Campo de texto com suporte a label, ícone, mensagem de erro e hint.

**Quando usar:** Todo campo de formulário de texto — nome, email, busca, descrição, etc.

**Quando NÃO usar:** Checkboxes, selects, textareas complexas (use elementos nativos estilizados diretamente). Campos de senha com toggle (estenda o componente).

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `label` | `string` | — | Label exibida acima do campo |
| `error` | `string` | — | Mensagem de erro (borda vermelha + texto) |
| `hint` | `string` | — | Texto auxiliar abaixo do campo (só aparece sem erro) |
| `icon` | `ReactNode` | — | Ícone posicionado à esquerda do campo |
| `...props` | `InputHTMLAttributes` | — | Qualquer prop nativa de `<input>` |

**Exemplos:**

```tsx
<Input label="Nome" placeholder="Ex: João Silva" />

<Input
  label="Buscar cliente"
  icon={<Search size={16} />}
  placeholder="Digite o nome..."
  value={busca}
  onChange={(e) => setBusca(e.target.value)}
/>

<Input label="Email" type="email" error="Email inválido" />

<Input label="Slug" hint="Usado na URL pública" />
```

**Componentes relacionados:** `Button` (geralmente usado junto em formulários), `Modal` (formulários dentro de modal)

---

### `Modal`

**Arquivo:** `components/ui/Modal.tsx`

**Objetivo:** Overlay de diálogo para ações que requerem foco — formulários, confirmações, detalhes.

**Quando usar:** Criar/editar registros, confirmar ações destrutivas, exibir detalhes sem sair da página.

**Quando NÃO usar:** Mensagens de toast/feedback rápido (use estado visual inline). Conteúdo que o usuário precisa consultar com frequência (prefira sidebar ou painel).

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `open` | `boolean` | obrigatório | Controla visibilidade |
| `onClose` | `() => void` | obrigatório | Chamado ao fechar (ESC, overlay, botão X) |
| `title` | `string` | obrigatório | Título do modal |
| `description` | `string` | — | Subtítulo opcional |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Largura (`max-w-sm`, `max-w-lg`, `max-w-2xl`) |
| `footer` | `ReactNode` | — | Botões de ação no rodapé |
| `children` | `ReactNode` | obrigatório | Conteúdo principal |

**Exemplo:**

```tsx
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Editar cliente"
  description="Atualize as informações abaixo."
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
      <Button variant="primary" loading={saving} onClick={handleSave}>Salvar</Button>
    </>
  }
>
  <div className="flex flex-col gap-4">
    <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
    <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
  </div>
</Modal>
```

**Comportamento:** Fecha ao clicar no overlay ou pressionar `ESC`. Bloqueia scroll do body enquanto aberto.

---

### `Table`

**Arquivo:** `components/ui/Table.tsx`

**Objetivo:** Tabela genérica e tipada para exibir listas de dados com colunas configuráveis.

**Quando usar:** Listagens de clientes, campanhas, colaboradores, lançamentos financeiros, etc.

**Quando NÃO usar:** Dados com hierarquia complexa ou DnD (use Kanban ou Checklist). Grids de cards visuais (use CSS grid).

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `columns` | `Column<T>[]` | obrigatório | Definição das colunas |
| `data` | `T[]` | obrigatório | Array de dados |
| `keyExtractor` | `(row: T) => string` | obrigatório | Função que retorna chave única por linha |
| `loading` | `boolean` | `false` | Exibe estado de carregamento |
| `empty` | `ReactNode` | — | Conteúdo quando lista está vazia |
| `onRowClick` | `(row: T) => void` | — | Callback ao clicar em uma linha |

**Tipo `Column<T>`:**

```ts
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode  // se omitido, usa row[key] direto
  className?: string
}
```

**Exemplo:**

```tsx
const columns: Column<Cliente>[] = [
  { key: 'name', header: 'Nome' },
  { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
  {
    key: 'actions',
    header: '',
    render: (row) => (
      <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Editar</Button>
    )
  },
]

<Table
  columns={columns}
  data={clientes}
  keyExtractor={(c) => c.id}
  loading={loading}
  onRowClick={(c) => router.push(`/clientes/${c.id}`)}
  empty={<span>Nenhum cliente cadastrado ainda.</span>}
/>
```

---

## 🧭 Layout

> Componentes estruturais que formam o shell da aplicação. Não devem ser instanciados manualmente nas páginas — são renderizados pelos layouts (`app/(app)/layout.tsx` e `app/(collaborator)/layout.tsx`).

---

### `Sidebar`

**Arquivo:** `components/layout/Sidebar.tsx`

**Objetivo:** Navegação lateral fixa do painel do gestor (admin/manager).

**Quando usar:** Renderizado automaticamente pelo `app/(app)/layout.tsx`. Não instanciar manualmente.

**Quando NÃO usar:** No painel do colaborador (use `CollaboratorSidebar`).

**Comportamento:** Marca o item ativo com base na rota atual (`usePathname`). Agrupa itens em seções (PRINCIPAL, CLIENTES & CAMPANHAS, GESTÃO, FERRAMENTAS, OUTROS). Botão de logout no rodapé.

**Props:** Nenhuma — lê dados do `useAuth()` internamente.

**Componentes relacionados:** `CollaboratorSidebar`, `Header`

---

### `Header`

**Arquivo:** `components/layout/Header.tsx`

**Objetivo:** Barra superior do painel do gestor com avatar do usuário e notificações.

**Quando usar:** Renderizado automaticamente pelo `app/(app)/layout.tsx`. Não instanciar manualmente.

**Quando NÃO usar:** No painel do colaborador (use `CollaboratorHeader`).

**Props:** Nenhuma — lê dados do `useAuth()` internamente.

**Componentes relacionados:** `NotificationBell`, `CollaboratorHeader`

---

### `CollaboratorSidebar`

**Arquivo:** `components/layout/CollaboratorSidebar.tsx`

**Objetivo:** Navegação lateral do painel do colaborador. Versão reduzida da Sidebar com apenas os itens permitidos para o role `collaborator`.

**Quando usar:** Renderizado automaticamente pelo `app/(collaborator)/layout.tsx`. Não instanciar manualmente.

**Props:** Nenhuma.

**Componentes relacionados:** `Sidebar`, `CollaboratorHeader`

---

### `CollaboratorHeader`

**Arquivo:** `components/layout/CollaboratorHeader.tsx`

**Objetivo:** Barra superior do painel do colaborador.

**Quando usar:** Renderizado automaticamente pelo `app/(collaborator)/layout.tsx`. Não instanciar manualmente.

**Props:** Nenhuma.

**Componentes relacionados:** `Header`, `CollaboratorSidebar`

---

### `NotificationBell`

**Arquivo:** `components/layout/NotificationBell.tsx`

**Objetivo:** Sino de notificações com contador de não lidas e dropdown de painel.

**Quando usar:** Já está embutido no `Header`. Não instanciar em outros lugares.

**Quando NÃO usar:** Não criar um segundo sino em outras partes da UI.

**Comportamento:** Fecha ao clicar fora (`mousedown` listener). Chama `markAsRead` ao abrir. Suporta `markAllAsRead`. Exibe ícone diferente por tipo (`task`, `alert`, `info`).

**Props:** Nenhuma — usa `useNotifications()` internamente.

**Hooks usados:** `useNotifications`

---

### `NotificationSound`

**Arquivo:** `components/layout/NotificationSound.tsx`

**Objetivo:** Componente invisível que toca som (`/public/sounds/notification.mp3`) quando chega uma nova notificação.

**Quando usar:** Renderizado automaticamente pelo `app/(app)/layout.tsx`. Não instanciar manualmente e não renderizar duas vezes.

**Quando NÃO usar:** Em qualquer outro lugar. É um singleton de áudio.

**Comportamento:** Aguarda interação do usuário antes de tocar (restrição de browsers). Só toca em novas notificações, nunca no carregamento inicial.

**Props:** Nenhuma.

---

## 🤖 IA (Alpha)

> Componentes do sistema de IA integrado. O fluxo é: `AlphaWidget` ou `AlphaVoiceButton` → `AlphaChatPanel` → `AlphaChatInput` + `AlphaChatMessage` + `AlphaToolBadge`.

---

### `AlphaWidget`

**Arquivo:** `components/AlphaWidget.tsx`

**Objetivo:** Widget flutuante de chat com a Alpha (baseado no ElevenLabs Conversational AI). Aparece como botão no canto da tela e expande para chat de voz.

**Quando usar:** Renderizado automaticamente pelo `app/(app)/layout.tsx`. Não instanciar manualmente.

**Quando NÃO usar:** No painel do colaborador (não está no layout deles).

**Comportamento:** Usa a biblioteca `@elevenlabs/react`. Conecta com o agente via `AGENT_ID`. Implementa a tool `buscar_memoria` para acessar histórico de conversas do Supabase.

**Props:** Nenhuma.

**Componentes relacionados:** `AlphaVoiceButton`, `AlphaChatPanel`

---

### `AlphaVoiceButton`

**Arquivo:** `components/AlphaVoiceButton.tsx`

**Objetivo:** Botão flutuante de voz alternativo para ativar/desativar a Alpha por voz via `useAlphaVoice`.

**Quando usar:** Renderizado automaticamente pelo `app/(app)/layout.tsx`. Não instanciar manualmente.

**Comportamento:** Sincroniza estado com extensão Chrome via `localStorage.alphaAtiva`. Exibe animação de ondas quando ativo.

**Props:** Nenhuma.

**Hooks usados:** `useAlphaVoice`

---

### `AlphaChatPanel`

**Arquivo:** `components/ai/AlphaChatPanel.tsx`

**Objetivo:** Painel completo de chat textual com a Alpha — cabeçalho, lista de mensagens e input.

**Quando usar:** Na página `/ai` (página dedicada ao chat com a Alpha).

**Quando NÃO usar:** Não embute em modais ou sidebars — é um painel de tela cheia.

**Props:** Nenhuma — usa `useAlphaAI()` internamente.

**Componentes filhos:** `AlphaChatMessage`, `AlphaChatInput`

**Hooks usados:** `useAlphaAI`

---

### `AlphaChatInput`

**Arquivo:** `components/ai/AlphaChatInput.tsx`

**Objetivo:** Campo de entrada do chat da Alpha com suporte a texto, envio por Enter, gravação de áudio e transcrição.

**Quando usar:** Usado internamente pelo `AlphaChatPanel`. Não instanciar diretamente.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `loading` | `boolean` | Desabilita o input enquanto Alpha responde |
| `onSend` | `(texto: string) => void` | Envia mensagem de texto |
| `onSendVoice` | `(texto: string) => void` | Envia mensagem de voz (texto transcrito) |
| `onSendAudio` | `(blob: Blob, mimeType: string) => Promise<void>` | Envia áudio bruto para transcrição |

**Comportamento:** `Enter` envia, `Shift+Enter` quebra linha. Botão de microfone inicia/para gravação com timer. Auto-resize do textarea.

---

### `AlphaChatMessage`

**Arquivo:** `components/ai/AlphaChatMessage.tsx`

**Objetivo:** Bolha de mensagem individual — diferencia visualmente mensagens do usuário (direita, azul) e da Alpha (esquerda, branca).

**Quando usar:** Usado internamente pelo `AlphaChatPanel`. Não instanciar diretamente.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `message` | `ChatMessage` | Objeto de mensagem com `role`, `content`, `createdAt` |

---

### `AlphaToolBadge`

**Arquivo:** `components/ai/AlphaToolBadge.tsx`

**Objetivo:** Badge inline que aparece nas mensagens da Alpha para indicar qual ferramenta do CRM foi consultada.

**Quando usar:** Usado internamente pelo `AlphaChatMessage`. Não instanciar diretamente.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `toolName` | `string` | Nome interno da tool (ex: `getClientes`, `getFinanceiro`) |

**Tools mapeadas:**

| Nome interno | Badge exibido |
|---|---|
| `getResumoGeral` | 📊 Resumo Geral |
| `getClientes` | 👥 Clientes |
| `getTarefas` | ✅ Tarefas |
| `getFinanceiro` | 💰 Financeiro |
| `getCampanhas` | 📣 Campanhas |
| `getIntegracoes` | 🔌 Integrações |

---

## ✅ Tarefas

---

### `KanbanColumn`

**Arquivo:** `components/tasks/KanbanColumn.tsx`

**Objetivo:** Coluna do board Kanban — área droppable que agrupa `TaskCard`s de um mesmo status.

**Quando usar:** Na página de tarefas (`/tarefas`). Instanciado pelo `DndContext` da página.

**Quando NÃO usar:** Fora do contexto de tarefas Kanban.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `id` | `TaskStatus` | Identificador da coluna (ex: `'todo'`, `'doing'`, `'done'`) |
| `label` | `string` | Título exibido na coluna |
| `icon` | `LucideIcon` | Ícone da coluna |
| `color` | `string` | Cor do ícone/indicador |
| `tasks` | `Task[]` | Tarefas desta coluna |
| `userRole` | `'admin' \| 'collaborator'` | Controla ações disponíveis |
| `currentUserId` | `string` | ID do usuário logado |
| `onDuplicate` | `(task: Task) => void` | — |
| `onEdit` | `(task: Task) => void` | — |
| `onDelete` | `(id: string) => void` | — |
| `onMove` | `(id: string, status: TaskStatus) => void` | — |
| `onClick` | `(task: Task) => void` | Abre detalhe da tarefa |

**Componentes filhos:** `TaskCard`

---

### `TaskCard`

**Arquivo:** `components/tasks/TaskCard.tsx`

**Objetivo:** Card de tarefa individual — draggable, com prioridade, data de vencimento e ações contextuais.

**Quando usar:** Usado internamente pelo `KanbanColumn`. Não instanciar diretamente.

**Props:** Mesmas do `KanbanColumn` para uma única tarefa + `task: Task`.

**Comportamento:** Usa `useSortable` do `@dnd-kit/sortable`. Fica com `opacity: 0.5` ao ser arrastado. Ações (editar, duplicar, excluir, mover) respeitam o `userRole` — colaboradores têm acesso restrito.

**Cores de prioridade:**

| Prioridade | Estilo |
|---|---|
| `urgente` / `alta` | `text-red-600 bg-red-50 border-red-200` |
| `media` | `text-amber-600 bg-amber-50 border-amber-200` |
| `baixa` | `text-green-600 bg-green-50 border-green-200` |

---

## 📋 Checklists

---

### `SortableChecklistCard`

**Arquivo:** `components/checklists/SortableChecklistCard.tsx`

**Objetivo:** Card de checklist completo — sortable (pode ser reordenado entre outros cards), com lista de itens, barra de progresso e ações.

**Quando usar:** Na página de checklists (`/checklists`). Instanciado pelo `DndContext` da página.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `list` | `Checklist` | Dados do checklist |
| `updateChecklist` | `function` | Atualiza título/datas |
| `deleteChecklist` | `function` | Remove o checklist |
| `duplicateChecklist` | `function` | Duplica o checklist |
| `addItem` | `function` | Adiciona item |
| `updateItem` | `function` | Edita texto de item |
| `toggleItem` | `function` | Marca/desmarca item |
| `deleteItem` | `function` | Remove item |
| `updatePositions` | `function` | Salva nova ordem dos itens |

**Comportamento:** Usa `@dnd-kit` para reordenar os próprios `SortableChecklistItem` internamente. O card em si também é sortable (pode ser reordenado na página). Exibe dias da semana (`DIAS_SEMANA`) para agendamento.

**Componentes filhos:** `SortableChecklistItem`

---

### `SortableChecklistItem`

**Arquivo:** `components/checklists/SortableChecklistItem.tsx`

**Objetivo:** Item individual de checklist — sortable com drag handle, checkbox, edição inline e exclusão.

**Quando usar:** Usado internamente pelo `SortableChecklistCard`. Não instanciar diretamente.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `item` | `ChecklistItem` | Dados do item |
| `onToggle` | `(id, completed) => void` | Marca/desmarca |
| `onDelete` | `(id) => void` | Remove |
| `onEdit` | `(id, text) => void` | Inicia edição |
| `isEditing` | `boolean` | Estado de edição controlado externamente |
| `editingText` | `string` | Texto sendo editado |
| `setEditingText` | `(text) => void` | Atualiza texto |
| `onSaveEdit` | `(id) => void` | Salva edição |
| `onCancelEdit` | `() => void` | Cancela edição |

**Comportamento:** Handle de drag (`GripVertical`) à esquerda. Fica com `opacity: 0.5` durante arrasto. Edição inline — substitui o texto por um `<input>` ao entrar em modo de edição.

---

## 💬 WhatsApp

---

### `WhatsAppConnect`

**Arquivo:** `components/whatsapp/WhatsAppConnect.tsx`

**Objetivo:** Widget de conexão/desconexão da instância WhatsApp via Evolution API. Exibe QR Code, status, e lista de grupos disponíveis.

**Quando usar:** Na página de integrações (`/integracoes`) para gerenciar a conexão WhatsApp.

**Quando NÃO usar:** Em modais genéricos ou outras páginas. É um widget autocontido específico para integração.

**Props:**

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `compact` | `boolean` | `false` | Versão compacta sem alguns elementos visuais |
| `showGroupsButton` | `boolean` | `false` | Exibe botão para listar grupos WhatsApp |

**Estados internos:** `connected`, `connecting`, `disconnected`, `loading`, `error`. Faz polling automático do status via `/api/whatsapp/instance`.

---

## 📐 Padrões de Nomenclatura

### Arquivos

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente | PascalCase | `TaskCard.tsx` |
| Hook | camelCase com `use` | `useTasks.ts` |
| Página | `page.tsx` (Next.js) | `app/(app)/tarefas/page.tsx` |
| Layout | `layout.tsx` (Next.js) | `app/(app)/layout.tsx` |
| API Route | `route.ts` (Next.js) | `app/api/tasks/route.ts` |

### Componentes

- **Named export** sempre — nunca `default export`
- Props tipadas com `interface` no topo do arquivo
- Nome do componente = nome do arquivo (PascalCase)

### Subcomponentes

Componentes filhos que não fazem sentido fora do pai ficam no mesmo arquivo ou na mesma pasta:

```
components/
└── checklists/
    ├── SortableChecklistCard.tsx   # pai
    └── SortableChecklistItem.tsx   # filho (pasta própria pois é grande)
```

### Pastas por domínio

```
components/
├── ui/           # Primitivos do design system (sem lógica de negócio)
├── layout/       # Shell da aplicação
├── ai/           # Tudo relacionado à Alpha
├── tasks/        # Tudo relacionado a tarefas/Kanban
├── checklists/   # Tudo relacionado a checklists
└── whatsapp/     # Tudo relacionado à integração WhatsApp
```

### Antes de criar um componente novo

1. Verifique se já existe algo neste documento que resolve
2. Verifique se pode compor com `Card` + `CardHeader` + `Button` + `Table`
3. Se for um componente de domínio, crie na pasta correspondente
4. Se for reutilizável em múltiplos domínios, crie em `components/ui/`
5. Nunca acesse o Supabase dentro de componentes — use hooks

---

*Gerado a partir do código-fonte — atualize sempre que um novo componente for criado ou removido.*
