# CLAUDE.md — Agência Digital Alpha

> Documento de contexto para agentes de IA. Leia antes de qualquer tarefa.

---

## 🎯 Objetivo do Projeto

**Agência Digital Alpha** é um CRM/painel de gestão interno para agências de marketing digital. Ele permite que gestores e colaboradores gerenciem clientes, campanhas (Meta Ads + Google Ads), tarefas em Kanban, checklists, financeiro, relatórios e comunicação via WhatsApp — tudo em um único painel.

A IA integrada chama-se **Alpha** e tem acesso a dados reais do CRM via tool calling (clientes, tarefas, campanhas, financeiro).

---

## 🛠️ Stack Utilizada

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 |
| Estilização | Tailwind CSS 3 |
| Banco de dados | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| IA | OpenAI (chat + TTS) + ElevenLabs (voz) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Integrações | Meta Ads API, Google Ads API, WhatsApp (Evolution API) |
| Deploy | Vercel (inferido pelo Next.js) |

---

## 📁 Estrutura de Pastas

```
/
├── app/
│   ├── (app)/              # Rotas do gestor (admin)
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   ├── tarefas/
│   │   ├── campanhas/
│   │   ├── financeiro/
│   │   ├── relatorios/
│   │   ├── checklists/
│   │   ├── colaboradores/
│   │   ├── alertas/
│   │   ├── feedbacks/
│   │   ├── novidades/
│   │   ├── integracoes/
│   │   ├── ai/             # Chat com a Alpha
│   │   └── perfil/
│   ├── (collaborator)/     # Rotas do colaborador (acesso restrito)
│   │   └── colaborador/
│   ├── (auth)/             # Login
│   ├── api/                # Route handlers (API Routes)
│   │   ├── ai/             # Chat e transcrição de voz
│   │   ├── alpha/          # Endpoint principal da Alpha
│   │   ├── auth/callback/  # OAuth callbacks (Meta, Google)
│   │   ├── campaigns/      # Sync e métricas de campanhas
│   │   ├── integrations/   # Conectar integrações externas
│   │   ├── meta/           # Meta Ads account
│   │   ├── relatorios/     # Geração de mensagens de relatório
│   │   ├── reports/send/   # Envio de relatórios
│   │   ├── webhooks/       # Webhooks externos
│   │   └── whatsapp/       # Instância e grupos WhatsApp
│   └── globals.css
├── components/
│   ├── ai/                 # AlphaChatPanel, AlphaChatInput, AlphaChatMessage, AlphaToolBadge
│   ├── checklists/         # SortableChecklistCard, SortableChecklistItem
│   ├── layout/             # Sidebar, Header, CollaboratorSidebar, NotificationBell, NotificationSound
│   ├── tasks/              # KanbanColumn, TaskCard
│   ├── ui/                 # Button, Card, Input, Modal, Table
│   ├── whatsapp/           # WhatsAppConnect
│   ├── AlphaWidget.tsx     # Widget flutuante da Alpha
│   └── AlphaVoiceButton.tsx
├── hooks/                  # Custom hooks por domínio
│   ├── useAuth.ts
│   ├── useClientes.ts
│   ├── useTasks.ts
│   ├── useCampanhas.ts
│   ├── useFinanceiro.ts
│   ├── useChecklists.ts
│   ├── useColaboradores.ts
│   ├── useNotificacoes.ts
│   ├── usePermissions.ts
│   ├── useRelatorios.ts
│   ├── useAlphaAI.ts
│   ├── useAlphaVoice.ts
│   ├── useWhatsApp.ts
│   ├── useMetaAccount.ts
│   ├── useAlertas.ts
│   └── useColaboradorFinance.ts
├── lib/
│   ├── supabase.ts         # Client-side Supabase
│   ├── supabase-server.ts  # Server-side Supabase (cookies)
│   └── ai/
│       ├── AIService.ts          # Orquestrador principal da Alpha
│       ├── CRMToolsService.ts    # Ferramentas de acesso ao CRM
│       ├── MemoryService.ts      # Memória de conversa
│       ├── VoiceService.ts       # Síntese de voz
│       ├── InternetSearchService.ts
│       ├── types.ts
│       └── providers/
│           ├── openai.provider.ts
│           ├── openai-tts.provider.ts
│           └── elevenlabs.provider.ts
├── supabase/
│   ├── migrations/         # Arquivos SQL numerados (ex: 001_initial.sql)
│   └── *.sql               # Fixes e patches avulsos
├── middleware.ts            # Proteção de rotas por role
├── tailwind.config.ts
└── package.json
```

---

## 🎨 Convenções de Código

### Nomenclatura
- **Componentes**: PascalCase → `TaskCard.tsx`, `AlphaChatPanel.tsx`
- **Hooks**: camelCase com prefixo `use` → `useTasks.ts`, `useAlphaAI.ts`
- **Arquivos de rota**: `page.tsx`, `layout.tsx`, `route.ts` (padrão Next.js App Router)
- **Variáveis e funções**: camelCase
- **Constantes globais**: UPPER_SNAKE_CASE

### Linguagem
- Todo código, comentários e nomes de variáveis em **inglês**
- Textos exibidos na UI em **português brasileiro**
- Respostas da Alpha sempre em português brasileiro

### Estilização (Tailwind)
Use as cores do design system definidas em `tailwind.config.ts`:

```ts
background:      '#F8FAFC'   // fundo da página
surface:         '#FFFFFF'   // cards e painéis
border:          '#E2E8F0'   // bordas
primary:         '#1A56DB'   // ações principais
primary-hover:   '#1E40AF'
cta:             '#16A34A'   // ações de destaque (verde)
text-main:       '#1E293B'
text-muted:      '#64748B'
text-disabled:   '#94A3B8'
active-bg:       '#EFF6FF'
active-border:   '#BFDBFE'
hover-bg:        '#F1F5F9'
```

**Nunca use cores hardcoded** (ex: `bg-blue-600`). Sempre use os tokens acima.

### TypeScript
- Sempre tipar props de componentes com `interface` ou `type`
- Evite `any` — use `unknown` se necessário e faça narrowing
- Prefira tipos explícitos em funções assíncronas (`Promise<Tipo>`)

---

## ➕ Como Criar Novas Funcionalidades

1. **Defina o domínio**: a feature é de cliente, tarefa, campanha, financeiro ou IA?
2. **Banco de dados**: crie a migration SQL em `supabase/migrations/` com número sequencial (ex: `057_nova_feature.sql`). Sempre inclua RLS policies.
3. **Hook**: crie o hook em `hooks/use[NomeDominio].ts` usando o cliente Supabase (`lib/supabase.ts`). Isole toda a lógica de dados no hook.
4. **Componente**: crie em `components/[dominio]/NomeComponente.tsx`. O componente não deve conter lógica de dados — apenas receber props e renderizar.
5. **Página**: crie em `app/(app)/[rota]/page.tsx`. A página é responsável por chamar o hook e compor os componentes.
6. **API Route** (se necessário): crie em `app/api/[rota]/route.ts` para integrações externas ou operações server-side.

---

## 🧩 Como Escrever Componentes

```tsx
// components/tasks/TaskCard.tsx
interface TaskCardProps {
  task: Task
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-text-main font-medium">{task.title}</h3>
      {/* ... */}
    </div>
  )
}
```

- Componentes são **sempre exportados como named exports** (não default)
- Props são **tipadas com interface** no topo do arquivo
- Use tokens de cor do Tailwind, nunca valores arbitrários
- Ícones: use `lucide-react` (já instalado)

---

## 🪝 Como Escrever Hooks

```ts
// hooks/useTasks.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useTasks(clientId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
      if (!error) setTasks(data ?? [])
      setLoading(false)
    }
    fetchTasks()
  }, [clientId])

  return { tasks, loading }
}
```

- Hooks encapsulam **toda** a lógica de dados
- Retornam `{ data, loading, error }` ou variações diretas
- Realtime: use `supabase.channel()` quando a feature exige atualização em tempo real

---

## 🐛 Como Lidar com Bugs

1. **Reproduza** o bug de forma consistente antes de qualquer coisa
2. **Verifique o console** do browser e os logs do servidor (Network tab)
3. **RLS**: a maioria dos bugs silenciosos de dados vazio vêm de políticas RLS incorretas. Cheque `supabase/migrations/` e teste no painel do Supabase
4. **Realtime**: se dados não atualizam, verifique se a tabela tem realtime habilitado (`supabase/enable_realtime.sql`)
5. **DnD**: problemas de drag-and-drop geralmente são de `position` ou `id` desincronizados — veja `components/checklists/` como referência
6. Ao corrigir, crie um comentário `// [FIX vX.X] descrição` no código alterado (padrão já em uso no projeto)

---

## 📝 Como Criar Commits

Padrão: **Conventional Commits** em português

```
tipo(escopo): descrição curta

[corpo opcional]
```

**Tipos:**
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `refactor`: refatoração sem mudança de comportamento
- `style`: ajustes de UI/CSS
- `chore`: tarefas de manutenção (deps, configs)
- `docs`: documentação
- `db`: migration ou alteração de banco de dados

**Exemplos:**
```
feat(tarefas): adiciona prioridade urgente no Kanban
fix(rls): corrige política de acesso de colaboradores a checklists
db(migration): add coluna position em checklist_items
style(sidebar): ajusta overflow em telas menores
```

---

## ❓ Como Responder Quando Faltar Contexto

Se você (agente IA) não tiver certeza sobre algo:

1. **Não invente dados** — se não sabe como uma tabela é estruturada, leia a migration em `supabase/migrations/`
2. **Não assuma permissões** — verifique o `middleware.ts` para entender as regras de rota por role (`admin` vs `colaborador`)
3. **Leia os hooks existentes** antes de criar novos — provavelmente já existe um `use[Dominio].ts` para o que você precisa
4. **Consulte os arquivos de análise** na raiz (`analise_*.md`) — eles documentam decisões técnicas importantes
5. Se ainda houver dúvida, pergunte ao usuário em vez de assumir

---

## ✅ Boas Práticas Obrigatórias

- **RLS sempre**: toda tabela nova precisa de Row Level Security habilitada e policies definidas
- **Hooks para dados**: nunca acesse o Supabase diretamente em componentes ou páginas
- **Tokens de cor**: nunca use cores arbitrárias — sempre os tokens de `tailwind.config.ts`
- **Português na UI**: toda string exibida ao usuário deve estar em pt-BR
- **Server vs Client**: use `lib/supabase-server.ts` em Server Components e Route Handlers; use `lib/supabase.ts` em Client Components e hooks
- **Migrations sequenciais**: sempre incremente o número da migration (`057_`, `058_`...)
- **Sem `any`**: nunca use `any` no TypeScript sem justificativa
- **Realtime com cuidado**: habilite realtime apenas nas tabelas que realmente precisam (performance)

---

## 🚫 O Que Nunca Deve Ser Feito

- ❌ Acessar o Supabase diretamente em componentes (vai contra o padrão de hooks)
- ❌ Hardcodar cores fora dos tokens do Tailwind
- ❌ Criar tabelas sem RLS habilitado
- ❌ Editar migrations antigas — sempre crie uma nova migration para correções
- ❌ Expor chaves de API no client-side (use variáveis de ambiente `NEXT_PUBLIC_` apenas para chaves públicas)
- ❌ Fazer a Alpha inventar dados — ela deve usar sempre as ferramentas do `CRMToolsService`
- ❌ Usar `default export` em componentes (o projeto usa named exports)
- ❌ Misturar lógica de negócio dentro de componentes de UI

---

## 🔐 Roles e Permissões

O sistema tem dois roles principais, controlados via `middleware.ts` e RLS:

| Role | Acesso |
|---|---|
| `admin` (gestor) | Todas as rotas em `/(app)/` |
| `colaborador` | Apenas rotas em `/(collaborator)/colaborador/` |

Sempre verifique o role do usuário antes de exibir ações sensíveis. Use o hook `usePermissions.ts`.

---

*Gerado automaticamente a partir do código-fonte do projeto — mantenha atualizado a cada mudança estrutural.*
