# RULES.md — Agência Digital Alpha
> Versão 2.0 — Gerada com base no codebase real (staging, julho/2026)
> Estas regras refletem o estado atual do projeto e os padrões já estabelecidos no código.
> Todo agente de IA (Manus) ou desenvolvedor deve seguir sem exceção.

---

## 1. Stack e Ambiente

- **Framework:** Next.js 14.2.5 com App Router
- **Linguagem:** TypeScript 5 (strict implícito — zero `any`)
- **Estilização:** Tailwind CSS 3.4 + Design System definido em `tailwind.config.ts`
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Pacotes chave:** `@supabase/ssr` ^0.5.2, `@supabase/supabase-js` ^2.44.4, `lucide-react` ^0.383.0, `@dnd-kit/*`, `@elevenlabs/react` 1.6.1
- **Gerenciador de pacotes:** pnpm (há `pnpm-lock.yaml` e `pnpm-workspace.yaml` — nunca usar `npm install`)
- **Deploy:** Vercel — branch `staging` = homologação, branch `main` = produção
- **Variáveis de ambiente:** `.env.local` para segredos; nunca hardcodar

---

## 2. Design System — Cores e Tokens

O `tailwind.config.ts` define os tokens oficiais. **Sempre usar os tokens — nunca valores arbitrários.**

| Token Tailwind | Valor hex | Uso |
|---|---|---|
| `bg-background` | `#F8FAFC` | Fundo de página |
| `bg-surface` | `#FFFFFF` | Cards, modais, sidebar |
| `border-border` | `#E2E8F0` | Todas as bordas |
| `text-primary` / `bg-primary` | `#1A56DB` | Ações principais, links ativos |
| `bg-primary-hover` | `#1E40AF` | Hover de botão primário |
| `bg-cta` | `#16A34A` | Botão de CTA (salvar, confirmar) |
| `bg-cta-hover` | `#15803D` | Hover do CTA |
| `text-text-main` | `#1E293B` | Texto principal |
| `text-text-muted` | `#64748B` | Texto secundário, labels |
| `text-text-disabled` | `#94A3B8` | Texto desabilitado |
| `bg-active-bg` | `#EFF6FF` | Fundo de item ativo na sidebar |
| `border-active-border` | `#BFDBFE` | Borda de item ativo |
| `bg-hover-bg` | `#F1F5F9` | Hover de itens de lista |

### Nunca fazer isso:
```tsx
// ERRADO — hardcoded
className="text-[#1E293B] bg-[#F8FAFC] border-[#E2E8F0]"

// CERTO — tokens
className="text-text-main bg-background border-border"
```

### Padrão de item ativo na sidebar (já estabelecido no código):
```tsx
isActive
  ? 'bg-active-bg text-primary border border-active-border'
  : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
```

---

## 3. Estrutura de Pastas

```
/app
  /(app)/              → Painel admin (admin + manager)
  /(collaborator)/     → Painel colaborador
  /(auth)/login/       → Página de login
  /api/                → Route Handlers do Next.js
/components
  /ai/                 → AlphaChatInput, AlphaChatPanel, etc.
  /checklists/         → SortableChecklistCard, SortableChecklistItem
  /layout/             → Sidebar, Header, CollaboratorSidebar, CollaboratorHeader
  /tasks/              → KanbanColumn, TaskCard
  /ui/                 → Button, Card, Input, Modal, Table (globais)
  /whatsapp/           → WhatsAppConnect
/hooks                 → useX.ts — toda lógica de dados fica aqui
/lib
  /ai/                 → AIService, CRMToolsService, providers/
  supabase.ts          → createClient() para browser
  supabase-server.ts   → createServerClient() para server/API
/middleware.ts         → Proteção de rotas por role
/supabase/migrations/  → Migrações SQL numeradas (001 → 999)
/n8n/                  → Workflows N8N (não alterar sem contexto)
/public/sounds/        → notification.mp3
```

### Regras de localização:
- Lógica de dados → sempre em `/hooks`
- Componentes usados em 2+ módulos → `/components/ui/`
- Componentes de um único módulo → `/components/[modulo]/`
- Clientes Supabase → apenas `lib/supabase.ts` (browser) ou `lib/supabase-server.ts` (server)
- Nunca criar arquivos de análise, diagnóstico ou teste na raiz do projeto

---

## 4. Convenções de Código

### TypeScript
- Zero `any` — tipar tudo explicitamente
- `interface` para shapes de objetos; `type` para unions
- Tipos de domínio exportados junto ao hook que os define (ex: `Client` exportado de `useClientes.ts`)
- PascalCase para interfaces e types: `Client`, `Lancamento`, `Report`

### React / Next.js
- Componentes sempre funcionais — zero class components
- `'use client'` apenas quando necessário (hooks de estado, `useRouter`, event handlers)
- Páginas sem interatividade devem ser Server Components
- Nunca buscar dados diretamente em `page.tsx` — sempre delegar para hooks
- Formulários: usar `onChange`/`onClick` — nunca `<form action={serverAction}>` em páginas `'use client'`

### Supabase — Regras Críticas
```ts
// CERTO — em hooks/componentes client
import { createClient } from '@/lib/supabase'
export function useAlgo() {
  const supabase = useMemo(() => createClient(), [])
}

// ERRADO — fora de hook/componente (variável de módulo — vaza entre requests)
const supabase = createClient()

// CERTO — em API routes e Server Components
import { createServerClient } from '@/lib/supabase-server'

// NUNCA em componentes/hooks client
// usar SUPABASE_SERVICE_ROLE_KEY fora de /app/api/
```

---

## 5. Nomeação

| Tipo | Convenção | Exemplo real no projeto |
|---|---|---|
| Páginas (App Router) | `page.tsx` dentro de pasta `kebab-case` | `clientes/[id]/page.tsx` |
| Layouts | `layout.tsx` | `app/(app)/layout.tsx` |
| Componentes | PascalCase | `CollaboratorSidebar.tsx`, `TaskCard.tsx` |
| Hooks | camelCase com prefixo `use` | `useClientes.ts`, `useFinanceiro.ts` |
| Lib e utilitários | camelCase | `supabase.ts`, `supabase-server.ts` |
| API Routes | `route.ts` dentro de pasta `kebab-case` | `api/reports/send/route.ts` |
| Migrações SQL | `NNN_descricao.sql` com número único | `019_reports.sql` |

### Atenção com migrações:
O número deve ser único — já existem conflitos no projeto (`010_` e `012_` aparecem duplicados). Sempre verificar o maior número existente em `/supabase/migrations/` antes de criar uma nova.

---

## 6. Estrutura de Commits

Seguir Conventional Commits em português:

```
feat(clientes): adicionar campo de endereço no formulário
fix(financeiro): corrigir cálculo de saldo com transações negativas
style(sidebar): migrar cores hardcoded para tokens do Design System
refactor(useAuth): substituir variável de módulo por useRef no cache de profile
chore(raiz): remover arquivos de análise do Manus
docs(rules): atualizar RULES.md com padrões reais do projeto
```

**Tipos válidos:** `feat` `fix` `style` `refactor` `chore` `docs` `test`

**Escopos válidos:** `auth` `clientes` `campanhas` `financeiro` `relatorios` `alertas` `tarefas` `checklists` `colaboradores` `feedbacks` `novidades` `integracoes` `ai` `whatsapp` `ui` `layout` `middleware` `supabase`

**Branch:** sempre commitar em `staging` — nunca direto em `main`

---

## 7. Componentes UI Existentes — Usar Antes de Criar

Antes de criar qualquer componente visual, verificar se já existe em `/components/ui/`:

| Componente | Importação | Props principais |
|---|---|---|
| `Button` | `@/components/ui/Button` | `variant` (primary/secondary/ghost/danger/cta), `size` (sm/md/lg), `loading`, `icon` |
| `Modal` | `@/components/ui/Modal` | `open`, `onClose`, `title`, `description`, `footer`, `size` (sm/md/lg) |
| `Card` | `@/components/ui/Card` | — |
| `Input` | `@/components/ui/Input` | — |
| `Table` | `@/components/ui/Table` | — |

### Spinner padrão (enquanto não há componente dedicado):
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3" />
```

---

## 8. Autenticação e Roles

O sistema tem 3 roles: `admin`, `manager`, `collaborator`.

```
admin / manager  → acessa /(app)/ — /dashboard, /clientes, /financeiro, /colaboradores...
collaborator     → acessa /(collaborator)/ — /colaborador/* exclusivamente
```

### Regras:
- O `middleware.ts` protege as rotas por role — não duplicar essa lógica nas páginas
- Os layouts `(app)/layout.tsx` e `(collaborator)/layout.tsx` fazem validação client-side adicional com `useAuth`
- `usePermissions` em `hooks/usePermissions.ts` fornece flags granulares (`isAdmin`, `can.deleteClient`, etc.) — usar nas páginas

### Cache de profile — regra crítica:
```ts
// NUNCA — variável de módulo vaza entre usuários em SSR
let cachedProfile: Profile | null = null

// CERTO — ref local ao hook
const cachedProfileRef = useRef<Profile | null>(null)
```

---

## 9. Regras de Performance

- `.select('campo1, campo2')` — nunca `select('*')` em tabelas grandes (`clients`, `financial_transactions`, `tasks`)
- Cache local em hooks de alta frequência: usar `useRef` com timestamp (padrão já implementado em `useClientes`)
- Imagens externas: domínio declarado em `next.config.js` via `remotePatterns`
- Imports nomeados: `import { format } from 'date-fns'` — nunca importar lib inteira
- `React.memo` apenas quando re-renders forem confirmados — não adivinhar

---

## 10. Regras de Acessibilidade

- Botões de ícone sem texto visível: obrigatório `aria-label` (padrão já no `Header.tsx` — seguir)
  ```tsx
  <button aria-label="Notificações"><Bell size={18} /></button>
  <button aria-label="Fechar modal"><X size={18} /></button>
  ```
- Inputs: associados a `<label>` via `htmlFor` + `id`
- Modais: usar o componente `Modal` existente — ele já gerencia `Escape`, scroll e foco
- Contraste: respeitar o Design System — as combinações de cor dos tokens já atendem 4.5:1

---

## 11. O Que Nunca Deve Ser Feito

- ❌ Commitar diretamente em `main` — sempre via PR de `staging`
- ❌ Usar `any` em TypeScript
- ❌ Desativar RLS no Supabase — em nenhuma tabela, nunca
- ❌ Usar `SUPABASE_SERVICE_ROLE_KEY` fora de `/app/api/`
- ❌ Criar `const supabase = createClient()` em nível de módulo (fora de hook/componente)
- ❌ Usar valores arbitrários de cor (`text-[#1E293B]`) quando o token existe (`text-text-main`)
- ❌ Criar arquivos `.md` de análise, `test-*.py` ou dumps `.sql` na raiz do projeto
- ❌ Duplicar lógica entre `(app)` e `(collaborator)` sem extrair componente compartilhado
- ❌ Criar dois hooks para o mesmo domínio (ex: `useNotificacoes` E `useNotifications` — consolidar)
- ❌ Criar número de migração SQL já existente — verificar `/supabase/migrations/` antes
- ❌ Usar `npm install` — o projeto usa pnpm
- ❌ Guardar segredos ou chaves de API no código fonte

---

## 12. Padrões Específicos do Projeto

### Admin vs Colaborador
Páginas equivalentes existem em `(app)/[modulo]/page.tsx` e `(collaborator)/colaborador/[modulo]/page.tsx`. Ao modificar qualquer lógica ou UI compartilhada, **sempre atualizar os dois lados** ou extrair para componente compartilhado.

### N8N / Evolution API
- Não alterar workflows em `/n8n/` sem entender o fluxo completo
- Instância Evolution API: `agencia` (canal Baileys)
- Endpoints: N8N em `n8n.digitalalpha.cloud` | Evolution em `evo.digitalalpha.cloud`

### Alpha AI (ElevenLabs + OpenAI)
- Providers em `lib/ai/providers/` — novos providers seguem o padrão existente
- `CRMToolsService` acessa dados reais do Supabase — testar em staging antes de deploy
- API `/api/alpha` usa `service_role` protegido por header `x-alpha-secret`

### Relatórios WhatsApp
- Fluxo: `useRelatorios` → `/api/reports/send` → N8N webhook → Evolution API → WhatsApp
- Variáveis de template: `<ALCAN>`, `<IMP>`, `<CTR>`, `<ROAS>` etc.

---

## 13. Checklist Antes de Finalizar Qualquer Tarefa

- [ ] Código compila sem erros TypeScript
- [ ] Nenhum `console.log` de debug foi deixado
- [ ] Nenhuma cor hardcoded introduzida — apenas tokens do Design System
- [ ] Se a página existe no admin, a versão colaborador foi atualizada também (ou está explicitamente fora do escopo da tarefa)
- [ ] Queries Supabase usam `.select()` com colunas específicas
- [ ] `createClient()` está dentro de hook/componente — não em nível de módulo
- [ ] Props de todos os componentes novos ou modificados estão tipadas
- [ ] Estados de loading e erro estão implementados nas interações com Supabase
- [ ] Nenhum arquivo de análise, teste ou diagnóstico foi criado na raiz do projeto
- [ ] Migração SQL (se houver) tem número único e sequencial
- [ ] Commit segue Conventional Commits em português
- [ ] Testado na branch `staging` antes de qualquer PR para `main`

---

*RULES.md v2.0 — Agência Digital Alpha — Julho 2026*
*Baseado na análise real do codebase: 111 arquivos TS/TSX · 56 migrações · 17 hooks · 21 API routes*
