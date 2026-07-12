# ARCHITECTURE.md — Agência Digital Alpha

> Documentação técnica da arquitetura do sistema. Para qualquer desenvolvedor ou agente de IA entender como o projeto funciona de ponta a ponta.

---

## 🗺️ Visão Geral

A Agência Digital Alpha é um **CRM full-stack** construído com Next.js 14 (App Router). A aplicação roda inteiramente no mesmo repositório — frontend, backend (API Routes) e integrações externas coexistem no mesmo projeto Next.js.

O banco de dados é gerenciado pelo **Supabase** (PostgreSQL), que também cuida de autenticação, armazenamento, realtime e Row Level Security (RLS).

A IA interna chama-se **Alpha** e opera via tool calling sobre os dados reais do CRM.

```
Browser ──► Next.js App (Vercel)
                ├── App Router (páginas React)
                ├── API Routes (server-side)
                └── Supabase Client/Server
                        └── PostgreSQL + Auth + Realtime
```

---

## 📁 Organização das Pastas

```
/
├── app/                    # Next.js App Router
│   ├── (app)/              # Grupo de rotas do gestor (admin)
│   ├── (collaborator)/     # Grupo de rotas do colaborador
│   ├── (auth)/             # Login
│   └── api/                # API Routes (server-side)
├── components/             # Componentes React reutilizáveis
├── hooks/                  # Custom hooks (toda lógica de dados)
├── lib/                    # Serviços e utilitários server/client
│   ├── supabase.ts         # Supabase client-side
│   ├── supabase-server.ts  # Supabase server-side
│   └── ai/                 # Camada de IA (Alpha)
├── supabase/
│   └── migrations/         # SQL numerado e versionado
├── middleware.ts            # Proteção de rotas e controle de acesso
└── tailwind.config.ts      # Design system (tokens de cor)
```

### Por que grupos de rotas `(app)` e `(collaborator)`?

Next.js App Router usa parênteses para criar **grupos de layout sem afetar a URL**. Isso permite que gestores (`/dashboard`) e colaboradores (`/colaborador/dashboard`) tenham layouts completamente diferentes — sidebar, header e permissões — sem duplicar código de rota.

---

## 🔐 Fluxo de Autenticação

A autenticação usa **Supabase Auth** com email/senha e OAuth (Meta, Google).

```
1. Usuário acessa qualquer rota protegida
        │
2. middleware.ts intercepta a requisição
        │
3. Supabase verifica o cookie de sessão
        │
    ┌───▼───────────────┐
    │  Não autenticado? │──► Redireciona para /login
    └───────────────────┘
        │ Autenticado
        ▼
4. Consulta profiles.role no banco
        │
    ┌───▼───────────────────┐
    │  role = collaborator? │──► /colaborador/dashboard
    └───────────────────────┘
        │ role = admin/manager
        ▼
5. Acesso liberado para rota solicitada
```

**Dupla verificação:** O `middleware.ts` faz a checagem server-side. O `layout.tsx` de cada grupo faz uma segunda checagem client-side via `useAuth()` para lidar com race conditions.

### Roles disponíveis

| Role | Acesso |
|---|---|
| `admin` | Todas as rotas `/(app)/` |
| `manager` | Todas as rotas `/(app)/` (mesmas permissões do admin) |
| `collaborator` | Apenas `/(collaborator)/colaborador/` |

### OAuth Callbacks

Os retornos de OAuth ficam em `app/api/auth/callback/`:
- `/api/auth/callback/meta` — Meta Ads (gestor)
- `/api/auth/callback/google` — Google Ads (gestor)
- `/api/auth/callback/meta-collaborator` — Meta Ads (colaborador)

---

## 🏗️ Estrutura do Front-end

### Padrão de Camadas

```
Página (page.tsx)
    └── chama Hook(s)
            └── acessa Supabase
    └── renderiza Componentes
            └── recebem dados via props
```

**Regra de ouro:** componentes nunca acessam o Supabase diretamente. Toda lógica de dados fica nos hooks.

### Layouts

```
app/
├── (app)/layout.tsx          # Layout do gestor
│   ├── <Sidebar />           # Navegação lateral fixa (w-64)
│   ├── <Header />            # Barra superior
│   ├── <NotificationSound /> # Áudio de notificações
│   ├── <AlphaWidget />       # Chat flutuante da IA Alpha
│   └── <AlphaVoiceButton />  # Botão de voz da Alpha
│
└── (collaborator)/layout.tsx # Layout do colaborador
    ├── <CollaboratorSidebar />
    └── <CollaboratorHeader />
```

### Componentes UI (`components/ui/`)

Componentes base do design system, sem lógica de negócio:

- `Button` — botão com variantes (primary, secondary, danger)
- `Card` — container com sombra e borda
- `Input` — campo de texto estilizado
- `Modal` — overlay com backdrop
- `Table` — tabela com cabeçalho fixo

### Componentes de Domínio

| Pasta | Componentes |
|---|---|
| `components/ai/` | `AlphaChatPanel`, `AlphaChatInput`, `AlphaChatMessage`, `AlphaToolBadge` |
| `components/tasks/` | `KanbanColumn`, `TaskCard` |
| `components/checklists/` | `SortableChecklistCard`, `SortableChecklistItem` |
| `components/layout/` | `Sidebar`, `Header`, `CollaboratorSidebar`, `NotificationBell` |
| `components/whatsapp/` | `WhatsAppConnect` |

---

## ⚙️ Estrutura do Back-end (API Routes)

Todas as operações server-side ficam em `app/api/`. Usam o Supabase server-side (`lib/supabase-server.ts`) para garantir autenticação via cookie.

```
app/api/
├── ai/
│   ├── route.ts            # Chat com a Alpha (POST)
│   └── transcribe/route.ts # Transcrição de voz (POST)
├── alpha/route.ts          # Endpoint alternativo da Alpha
├── auth/callback/
│   ├── meta/route.ts
│   ├── google/route.ts
│   └── meta-collaborator/route.ts
├── campaigns/
│   ├── metrics/route.ts    # Métricas de campanhas Meta/Google
│   └── sync/route.ts       # Sincronização de campanhas
├── integrations/
│   ├── route.ts            # Listar integrações
│   └── connect/            # Conectar Meta, Google
├── meta/account/route.ts   # Dados da conta Meta
├── relatorios/
│   └── gerar-mensagem/route.ts # Gerar texto de relatório com IA
├── reports/send/route.ts   # Enviar relatório via WhatsApp
├── webhooks/route.ts       # Receber eventos externos
└── whatsapp/
    ├── instance/route.ts   # Gerenciar instância WhatsApp
    └── groups/route.ts     # Listar grupos WhatsApp
```

---

## 🔄 Fluxo de Dados

### Leitura de dados (padrão comum)

```
1. Página monta → chama hook (ex: useClientes)
2. Hook executa query no Supabase
3. RLS filtra automaticamente pelo user.id
4. Hook retorna { data, loading, error }
5. Página renderiza componentes com os dados
```

### Escrita de dados (padrão comum)

```
1. Usuário interage com componente
2. Componente chama função do hook (ex: criarCliente)
3. Hook executa insert/update no Supabase
4. Supabase verifica RLS antes de persistir
5. Hook atualiza estado local ou re-faz a query
6. Componente re-renderiza com dados atualizados
```

### Dados em tempo real (Realtime)

Algumas tabelas usam `supabase.channel()` para escutar mudanças em tempo real:

```ts
supabase
  .channel('tasks-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
  .subscribe()
```

Tabelas com realtime habilitado: `tasks`, `notifications`, `checklists` (ver `supabase/enable_realtime.sql`).

---

## 🤖 Arquitetura da IA (Alpha)

A Alpha é uma assistente de IA com acesso aos dados reais do CRM via **tool calling**.

```
Usuário digita mensagem
        │
useAlphaAI (hook)
        │
POST /api/ai
        │
AIService.chat()
        ├── monta system prompt com data/hora de Brasília
        ├── recupera histórico via MemoryService
        └── chama OpenAI com tools disponíveis
                │
        OpenAI decide usar tool?
        ├── SIM → CRMToolsService executa query no Supabase
        │         → resultado volta para OpenAI
        │         → OpenAI gera resposta final
        └── NÃO → resposta direta
                │
        MemoryService salva conversa
                │
        Resposta retorna ao hook → componente renderiza
```

### Serviços de IA (`lib/ai/`)

| Arquivo | Responsabilidade |
|---|---|
| `AIService.ts` | Orquestrador principal — monta mensagens, executa tool loop (até 5 iterações) |
| `CRMToolsService.ts` | Define as ferramentas: `getClientes`, `getTarefas`, `getCampanhas`, `getFinanceiro`, etc. |
| `MemoryService.ts` | Persiste histórico de conversa por usuário |
| `VoiceService.ts` | Síntese de voz (OpenAI TTS ou ElevenLabs) |
| `InternetSearchService.ts` | Busca na web quando necessário |
| `providers/openai.provider.ts` | Implementação do provider OpenAI |
| `providers/elevenlabs.provider.ts` | Implementação do provider ElevenLabs |

---

## 🗄️ Banco de Dados

### Tabelas principais (inferidas do código)

| Tabela | Descrição |
|---|---|
| `profiles` | Perfis de usuário com `role` (admin/manager/collaborator) |
| `clients` | Clientes da agência |
| `tasks` | Tarefas no Kanban |
| `campaigns` | Campanhas de anúncios (Meta/Google) |
| `finances` | Lançamentos financeiros (receitas, gastos, investimentos) |
| `checklists` | Checklists por cliente ou tarefa |
| `integrations` | Integrações conectadas (Meta, Google, WhatsApp) |
| `notifications` | Notificações em tempo real |

### RLS (Row Level Security)

**Toda tabela tem RLS habilitado.** As políticas garantem que cada usuário vê apenas os dados que lhe pertencem. Colaboradores têm acesso restrito — veem somente os clientes e tarefas atribuídos a eles.

### Migrations

Versionadas sequencialmente em `supabase/migrations/`:

```
001_initial.sql
012_checklists.sql
021_collaborator_own_clients_rls.sql
046_add_urgent_priority.sql
054_add_checklist_position.sql
056_fix_checklist_rls_and_upsert.sql
...
```

**Nunca edite uma migration existente.** Sempre crie uma nova com o próximo número sequencial.

---

## 🔌 Integrações Externas

| Integração | Como funciona |
|---|---|
| **Meta Ads** | OAuth via `/api/auth/callback/meta` → token salvo em `integrations` → sync via `/api/campaigns/sync` |
| **Google Ads** | OAuth via `/api/auth/callback/google` → mesma lógica |
| **WhatsApp** | Evolution API — instância gerenciada via `/api/whatsapp/instance` |
| **OpenAI** | Chamadas server-side via `lib/ai/providers/openai.provider.ts` |
| **ElevenLabs** | TTS via `lib/ai/providers/elevenlabs.provider.ts` |

---

## ➕ Como Adicionar Novas Páginas

1. Defina o grupo de rota: `(app)` para gestores ou `(collaborator)` para colaboradores
2. Crie o arquivo: `app/(app)/[nome-da-rota]/page.tsx`
3. A página é automaticamente protegida pelo `middleware.ts` e pelo `layout.tsx` do grupo
4. Adicione o link na `Sidebar` ou `CollaboratorSidebar`

```tsx
// app/(app)/nova-feature/page.tsx
'use client'
import { useNovaFeature } from '@/hooks/useNovaFeature'

export default function NovaFeaturePage() {
  const { data, loading } = useNovaFeature()
  if (loading) return <div>Carregando...</div>
  return <div>{/* renderização */}</div>
}
```

---

## ➕ Como Adicionar Novas Funcionalidades

Siga sempre essa ordem:

```
1. Migration SQL  →  supabase/migrations/[N+1]_nome.sql
        ↓
2. Hook           →  hooks/use[Dominio].ts
        ↓
3. Componente(s)  →  components/[dominio]/NomeComponente.tsx
        ↓
4. Página         →  app/(app ou collaborator)/[rota]/page.tsx
        ↓
5. API Route      →  app/api/[rota]/route.ts  (se necessário)
        ↓
6. Tool da Alpha  →  lib/ai/CRMToolsService.ts  (se a IA precisar acessar)
```

---

## 🚫 Como Evitar Dependências Desnecessárias

### Regras

- **Não instale bibliotecas de UI** (ex: MUI, Chakra, shadcn) — o projeto tem componentes próprios em `components/ui/`
- **Não instale clientes HTTP** (axios, ky) — use `fetch` nativo nas API Routes
- **Não instale bibliotecas de estado global** (Redux, Zustand) — use hooks locais + Supabase Realtime
- **Não instale bibliotecas de formulário** (react-hook-form, formik) — use `useState` simples
- **Não instale bibliotecas de data** (date-fns, dayjs) — use `Date` nativo com `toLocaleString('pt-BR')`
- **Não instale bibliotecas de drag-and-drop** — já usa `@dnd-kit` (instalado)

### Antes de instalar qualquer pacote, pergunte:

1. O projeto já resolve isso de alguma forma?
2. Existe uma API nativa do browser/Node que resolve?
3. O pacote vai adicionar mais de 50kb ao bundle?

---

## 🌍 Variáveis de Ambiente

```env
# Supabase (públicas — usadas no client e server)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (apenas server-side)
OPENAI_API_KEY=

# ElevenLabs (apenas server-side)
ELEVENLABS_API_KEY=

# Meta Ads (apenas server-side)
META_APP_ID=
META_APP_SECRET=

# WhatsApp / Evolution API (apenas server-side)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```

**Nunca use `NEXT_PUBLIC_` em chaves secretas.** Variáveis com esse prefixo ficam expostas no bundle do client.

---

*Gerado a partir do código-fonte — mantenha atualizado a cada mudança arquitetural significativa.*
