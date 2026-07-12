# ENV.md — Agência Digital Alpha

> Documentação de todas as variáveis de ambiente do projeto.
> ⚠️ **Nunca commite valores reais neste arquivo.** Os valores ficam na Vercel e no Notion (página privada de credenciais).

---

## Como configurar

1. **Desenvolvimento local:** crie um arquivo `.env.local` na raiz do projeto (já está no `.gitignore`)
2. **Staging:** configure na Vercel em Settings → Environment Variables → contexto **Preview** (branch `staging`)
3. **Produção:** configure na Vercel em Settings → Environment Variables → contexto **Production**

---

## Supabase

| Variável | Contexto | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | URL do projeto Supabase (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Chave pública (anon key) — segura para expor no frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only ⚠️ | Chave secreta com acesso total. Nunca use no client. Usada em `/api/alpha`, `/api/collaborators/*`, `/api/relatorios/*` |

> Staging e produção têm projetos Supabase separados — cada ambiente tem suas próprias variáveis.
> Obter em: **Supabase Dashboard → Settings → API**

---

## OpenAI

| Variável | Contexto | Descrição |
|---|---|---|
| `OPENAI_API_KEY` | Server only | Chave da API OpenAI. Usada em `/api/ai` (chat) e `/api/ai/transcribe` (Whisper) |

> ⚠️ Monitorar uso em: https://platform.openai.com/settings/organization/usage
> Obter em: https://platform.openai.com/api-keys

---

## ElevenLabs

| Variável | Contexto | Descrição |
|---|---|---|
| `ELEVENLABS_API_KEY` | Server only | Chave da API ElevenLabs. Usada para síntese de voz da Alpha |
| `ELEVENLABS_VOICE_ID` | Server only | ID da voz usada pela Alpha (ex: `XrExE9yKIg1WjnnlVkGX`) |
| `ELEVENLABS_WEBHOOK_SECRET` | Server only | Secret para validar webhooks do ElevenLabs |

> Obter em: https://elevenlabs.io/app/settings/api-keys
> Agent ID da Alpha está hardcoded em `components/AlphaWidget.tsx`

---

## Meta for Developers

| Variável | Contexto | Descrição |
|---|---|---|
| `META_APP_ID` | Server only | ID do app no Meta for Developers |
| `META_APP_SECRET` | Server only | Secret do app Meta |
| `META_REDIRECT_URI` | Server only | URI de callback OAuth para gestores: `{APP_URL}/api/auth/callback/meta` |

> Usado em: `/api/integrations/connect/meta` e `/api/auth/callback/meta`
> Obter em: https://developers.facebook.com/apps

---

## Google Cloud

| Variável | Contexto | Descrição |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Server only | Client ID do OAuth 2.0 do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Server only | Client Secret do OAuth 2.0 |
| `GOOGLE_REDIRECT_URI` | Server only | URI de callback OAuth: `{APP_URL}/api/auth/callback/google` |

> APIs ativadas no projeto: Gmail, Google Drive, Google Calendar, Google Ads
> Usado em: `/api/integrations/connect/google` e `/api/auth/callback/google`
> Obter em: https://console.cloud.google.com/apis/credentials

---

## Brevo (E-mail Transacional)

| Variável | Contexto | Descrição |
|---|---|---|
| `BREVO_API_KEY` | Server only | Chave da API Brevo para envio de emails transacionais |
| `BREVO_SENDER_EMAIL` | Server only | Email remetente configurado no Brevo |

> Usado em: `/api/collaborators/invite` e `/api/collaborators/update-password`
> Obter em: https://app.brevo.com/settings/keys/api

---

## WhatsApp — Evolution API

| Variável | Contexto | Descrição |
|---|---|---|
| `EVOLUTION_API_URL` | Server only | URL base da instância Evolution API (ex: `https://evo.suaapi.com`) |
| `EVOLUTION_API_KEY` | Server only | API Key da Evolution API |

> Usado em: `/api/whatsapp/instance`, `/api/whatsapp/groups`, `/api/reports/send`

---

## Alpha AI (Integração ElevenLabs)

| Variável | Contexto | Descrição |
|---|---|---|
| `ALPHA_API_SECRET` | Server only | Chave secreta usada para autenticar chamadas do agente ElevenLabs ao endpoint `/api/alpha` |

> Este endpoint **sempre retorna HTTP 200** para não crashar o SDK do ElevenLabs.
> A chave é verificada via header `x-alpha-secret`.

---

## Geral

| Variável | Contexto | Descrição |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Client + Server | URL base do ambiente (ex: `https://agencia-digital-alpha.vercel.app`). Usada em callbacks OAuth e emails |

---

## Ambientes

| Ambiente | URL | Branch |
|---|---|---|
| **Produção** | `https://agencia-digital-alpha.vercel.app` | `main` |
| **Staging** | `https://agencia-digital-alpha-git-staging-thiago-santo-projects.vercel.app` | `staging` |

> ⚠️ **Regra obrigatória:** Todo commit deve ser feito na branch `staging`. Nunca commitar direto na `main`.

---

## Checklist ao configurar um novo ambiente

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `OPENAI_API_KEY` configurado
- [ ] `ELEVENLABS_API_KEY` configurado
- [ ] `ELEVENLABS_VOICE_ID` configurado
- [ ] `META_APP_ID` e `META_APP_SECRET` configurados
- [ ] `META_REDIRECT_URI` apontando para o ambiente correto
- [ ] `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados
- [ ] `GOOGLE_REDIRECT_URI` apontando para o ambiente correto
- [ ] `BREVO_API_KEY` e `BREVO_SENDER_EMAIL` configurados
- [ ] `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` configurados
- [ ] `ALPHA_API_SECRET` configurado
- [ ] `NEXT_PUBLIC_APP_URL` apontando para o ambiente correto

---

*Os valores reais ficam na Vercel (Settings → Environment Variables) e na página privada de credenciais no Notion.*
