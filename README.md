# Agência Digital Alpha

Sistema SaaS completo para gestão de agências digitais.

Gerencie clientes, campanhas (Meta Ads), tarefas (Kanban), checklists, financeiro, colaboradores, relatórios e conte com uma assistente de IA com voz chamada **Alpha**.

## Principais funcionalidades

- Dashboard com visão geral da agência
- Gestão de clientes
- Campanhas com sincronização de métricas do Meta Ads
- Tarefas em Kanban com prioridades e notificações
- Checklists com drag-and-drop e recorrência
- Módulo financeiro (receitas, gastos, investimentos e vencimentos)
- Painel de colaboradores com permissões
- Relatórios automáticos
- Integrações: Meta Ads, Google e WhatsApp
- Alpha AI: assistente conversacional com voz + ferramentas de CRM
- Notificações em tempo real e alertas

## Stack

| Camada       | Tecnologia                                      |
|--------------|-------------------------------------------------|
| Frontend     | Next.js 14 (App Router) + TypeScript + Tailwind |
| Backend      | Next.js Route Handlers                          |
| Banco / Auth | Supabase (PostgreSQL + Auth + RLS + Realtime)   |
| Drag & Drop  | @dnd-kit                                        |
| IA           | OpenAI + ElevenLabs                             |
| WhatsApp     | Evolution API                                   |

## Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- Conta no [Supabase](https://supabase.com)
- Chaves das APIs necessárias (OpenAI, ElevenLabs, Evolution API, Meta, Google)

## Como rodar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/ThiagoSantos-hub/agencia-digital-alpha.git
cd agencia-digital-alpha
```

### 2. Instale as dependências

```bash
pnpm install
# ou
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (necessário para a Alpha AI)
OPENAI_API_KEY=

# ElevenLabs (voz da Alpha)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Evolution API (WhatsApp)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```

> **Importante:** Nunca versione o arquivo `.env.local`. Ele já está no `.gitignore`.

### 4. Configure o banco de dados

1. Crie um projeto no Supabase
2. Execute as migrations da pasta `supabase/migrations/` (ou use o arquivo consolidado `supabase_completo.sql`)
3. Ative o Realtime nas tabelas necessárias

### 5. Rode o projeto

```bash
pnpm dev
# ou
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Estrutura principal

```
app/
├── (app)/              # Painel principal (admin/manager)
├── (collaborator)/     # Painel do colaborador
├── (auth)/             # Autenticação
└── api/                # Route Handlers

components/             # Componentes reutilizáveis
hooks/                  # Custom hooks
lib/                    # Utilitários e serviços (IA, Supabase)
supabase/
└── migrations/         # Schema do banco
```

## Scripts disponíveis

| Comando      | Descrição                   |
|--------------|-----------------------------|
| `pnpm dev`   | Ambiente de desenvolvimento |
| `pnpm build` | Build de produção           |
| `pnpm start` | Sobe o build de produção    |
| `pnpm lint`  | Roda o ESLint               |

## Roles

- **admin / manager** → acesso completo ao painel principal
- **collaborator** → painel restrito em `/colaborador/*`

O middleware redireciona automaticamente de acordo com a role do usuário.
