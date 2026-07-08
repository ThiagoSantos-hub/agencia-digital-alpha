-- ============================================================
-- DIGITAL ALPHA - SQL COMPLETO DO SUPABASE
-- ============================================================

-- ==============================
-- 001_initial.sql
-- ==============================

-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Migration Inicial
-- ==========================================

-- Tabela de perfis (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager')) DEFAULT 'manager',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuário vê o próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin vê todos os perfis"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger para criar profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Tabelas futuras (estrutura base)
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT CHECK (status IN ('ativo', 'inativo', 'prospecto')) DEFAULT 'ativo',
  manager_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('ativa', 'pausada', 'finalizada', 'rascunho')) DEFAULT 'rascunho',
  channel TEXT CHECK (channel IN ('meta_ads', 'google_ads', 'organico', 'outro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS nas tabelas futuras
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;


-- ==============================
-- 002_fix_rls_recursion.sql
-- ==============================

-- Fix: recursão infinita na política RLS "Admin vê todos os perfis"
-- Problema: a política consultava profiles dentro da RLS de profiles → loop infinito → erro 500
-- Solução: criar função SECURITY DEFINER que executa fora do contexto RLS

DROP POLICY IF EXISTS "Admin vê todos os perfis" ON profiles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Admin vê todos os perfis"
  ON profiles FOR SELECT
  USING (public.is_admin());


-- ==============================
-- 003_clients_policies.sql
-- ==============================

-- Políticas RLS para clients
-- Admin vê e edita todos os clientes
-- Manager vê e edita apenas os clientes onde manager_id = seu próprio id
-- Apenas Admin pode deletar

CREATE POLICY "Admin ve todos os clientes"
  ON clients FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Manager ve seus clientes"
  ON clients FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Admin e Manager podem criar clientes"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin() OR manager_id = auth.uid());

CREATE POLICY "Admin edita qualquer cliente"
  ON clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Manager edita seus clientes"
  ON clients FOR UPDATE
  USING (manager_id = auth.uid());

CREATE POLICY "Somente admin deleta clientes"
  ON clients FOR DELETE
  USING (public.is_admin());


-- ==============================
-- 004_missing_tables.sql
-- ==============================

-- ==========================================
-- Migration 004 — Tabelas faltantes
-- Agência Digital Alpha
-- ==========================================
-- Cria: finances, integrations, webhooks, notifications, campaign_metrics
-- Todas com RLS ativado e políticas adequadas
-- ==========================================

-- ─── FINANCES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finances (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escopo           TEXT        NOT NULL CHECK (escopo IN ('agencia', 'pessoal')),
  tipo             TEXT        NOT NULL CHECK (tipo IN ('receita', 'gasto', 'investimento')),
  categoria        TEXT        NOT NULL,
  descricao        TEXT        NOT NULL,
  valor            NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  dia_vencimento   INTEGER     NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_vencimento  DATE        NOT NULL,
  data_pagamento   DATE,
  status           TEXT        NOT NULL DEFAULT 'pendente'
                               CHECK (status IN ('pendente', 'pago', 'atrasado')),
  client_id        UUID        REFERENCES clients(id) ON DELETE SET NULL,
  recorrente       BOOLEAN     NOT NULL DEFAULT true,
  recorrencia      TEXT        CHECK (recorrencia IN ('mensal', 'semanal', 'anual')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finances_select_own"
  ON finances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "finances_insert_own"
  ON finances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "finances_update_own"
  ON finances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "finances_delete_own"
  ON finances FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "finances_select_admin"
  ON finances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER finances_updated_at
  BEFORE UPDATE ON finances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── INTEGRATIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integrations (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT        NOT NULL UNIQUE,
  label         TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'disconnected'
                            CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token  TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  connected_at  TIMESTAMPTZ,
  config        JSONB       DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select_authenticated"
  ON integrations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "integrations_update_admin"
  ON integrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO integrations (type, label, status) VALUES
  ('google_ads',      'Google Ads',      'disconnected'),
  ('gmail',           'Gmail',           'disconnected'),
  ('google_drive',    'Google Drive',    'disconnected'),
  ('google_calendar', 'Google Calendar', 'disconnected'),
  ('meta_ads',        'Meta Ads',        'disconnected')
ON CONFLICT (type) DO NOTHING;

-- ─── WEBHOOKS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhooks (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slot       INTEGER     NOT NULL UNIQUE CHECK (slot BETWEEN 1 AND 10),
  name       TEXT,
  url        TEXT,
  event      TEXT,
  active     BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_select_authenticated"
  ON webhooks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "webhooks_update_admin"
  ON webhooks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO webhooks (slot, active) VALUES
  (1, false), (2, false), (3, false), (4, false), (5, false)
ON CONFLICT (slot) DO NOTHING;

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT        NOT NULL
             CHECK (tipo IN ('vencimento_5dias', 'vencimento_hoje', 'pagamento_recebido', 'geral')),
  titulo     TEXT        NOT NULL,
  mensagem   TEXT        NOT NULL,
  finance_id UUID        REFERENCES finances(id) ON DELETE SET NULL,
  lida       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ─── CAMPAIGN_METRICS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_metrics (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id   UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  metric_key    TEXT        NOT NULL,
  metric_label  TEXT        NOT NULL,
  metric_value  TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, metric_key)
);

ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_metrics_select_authenticated"
  ON campaign_metrics FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "campaign_metrics_insert_authenticated"
  ON campaign_metrics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "campaign_metrics_update_authenticated"
  ON campaign_metrics FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "campaign_metrics_delete_authenticated"
  ON campaign_metrics FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE TRIGGER campaign_metrics_updated_at
  BEFORE UPDATE ON campaign_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS nas tabelas existentes (clients, campaigns) ───────────────────

CREATE POLICY "clients_select_authenticated"
  ON clients FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "clients_insert_admin"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_update_admin"
  ON clients FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "campaigns_select_authenticated"
  ON campaigns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "campaigns_insert_authenticated"
  ON campaigns FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "campaigns_update_authenticated"
  ON campaigns FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "campaigns_delete_admin"
  ON campaigns FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );



-- ==============================
-- 005_conversations_table.sql
-- ==============================

-- ==========================================
-- Migration 005 — Tabela de Conversas (Memória da Alpha)
-- Agência Digital Alpha
-- ==========================================

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript  JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- O usuário pode ver suas próprias conversas
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- O usuário pode inserir suas próprias conversas
CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin pode ver todas as conversas
CREATE POLICY "conversations_select_admin"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ==============================
-- 006_update_client_status.sql
-- ==============================

-- ==========================================
-- Migration 006 — Atualização de Status de Clientes
-- Agência Digital Alpha
-- ==========================================

-- 1. Remover a restrição antiga de status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- 2. Adicionar a nova restrição de status (sem prospecto, com atrasado)
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('ativo', 'inativo', 'atrasado'));

-- 3. Converter 'prospecto' para 'ativo' (já que prospecto será removido)
UPDATE clients SET status = 'ativo' WHERE status = 'prospecto';

-- 4. Adicionar coluna inativo_em
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inativo_em TIMESTAMPTZ;

-- 5. Comentário explicativo
COMMENT ON COLUMN clients.inativo_em IS 'Data e hora em que o cliente foi marcado como inativo';


-- ==============================
-- 007_meta_ads_integration.sql
-- ==============================

-- ==========================================
-- Integração Meta Ads e Visibilidade de Campanhas
-- Agência Digital Alpha
-- ==========================================

-- 1. Adicionar campos de Meta Ads na tabela de clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS show_campaigns BOOLEAN DEFAULT true;

-- 2. Adicionar campos de Meta Ads na tabela de campanhas
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date DATE;

-- 3. Comentários explicativos
COMMENT ON COLUMN clients.meta_ad_account_id IS 'ID da conta de anúncios do Meta para este cliente';
COMMENT ON COLUMN clients.show_campaigns IS 'Se as campanhas deste cliente devem aparecer no módulo de análise';
COMMENT ON COLUMN campaigns.meta_campaign_id IS 'ID real da campanha no Meta Ads';


-- ==============================
-- 008_fix_campaign_upsert.sql
-- ==============================

-- ==========================================
-- Fix: Constraint UNIQUE em meta_campaign_id
-- Necessário para o upsert da sincronização Meta Ads funcionar
-- Agência Digital Alpha
-- ==========================================

-- Remover duplicatas antes de criar a constraint
-- (mantém o registro mais recente por meta_campaign_id)
DELETE FROM campaigns
WHERE id NOT IN (
  SELECT DISTINCT ON (meta_campaign_id) id
  FROM campaigns
  WHERE meta_campaign_id IS NOT NULL
  ORDER BY meta_campaign_id, created_at DESC
);

-- Adicionar constraint UNIQUE em meta_campaign_id
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_meta_campaign_id_unique
  UNIQUE (meta_campaign_id);


-- ==============================
-- 009_campaigns_rls_policies.sql
-- ==============================

-- ==========================================
-- Fix: Políticas RLS para tabela campaigns
-- Sem isso, SELECT retorna [] mesmo com dados
-- Agência Digital Alpha
-- ==========================================

-- Admin vê todas as campanhas
CREATE POLICY "Admin vê todas as campanhas"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode inserir campanhas
CREATE POLICY "Admin insere campanhas"
  ON campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode atualizar campanhas
CREATE POLICY "Admin atualiza campanhas"
  ON campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode deletar campanhas
CREATE POLICY "Admin deleta campanhas"
  ON campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager vê campanhas dos seus clientes
CREATE POLICY "Manager vê campanhas dos seus clientes"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = campaigns.client_id
        AND clients.manager_id = auth.uid()
    )
  );


-- SKIPPED: 010_campaign_selected_metrics.sql (contém código React, não SQL)

-- ==============================
-- 010_fix_campaign_metrics_unique.sql
-- ==============================

-- ==========================================
-- Fix: Constraint UNIQUE em campaign_metrics
-- Necessário para o upsert de métricas funcionar
-- Agência Digital Alpha
-- ==========================================

-- Remover duplicatas antes de criar a constraint
DELETE FROM campaign_metrics
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, metric_key) id
  FROM campaign_metrics
  ORDER BY campaign_id, metric_key, updated_at DESC
);

-- Adicionar constraint UNIQUE composta
ALTER TABLE campaign_metrics
  ADD CONSTRAINT campaign_metrics_campaign_metric_unique
  UNIQUE (campaign_id, metric_key);


-- ==============================
-- 011_chat_histories_table.sql
-- ==============================

-- ==========================================
-- Migration 011 — Tabela de Histórico de Chat (Memória de Sessão)
-- Agência Digital Alpha
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_histories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_histories_user_id_key UNIQUE (user_id)
);

-- Ativar RLS
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "chat_histories_select_own"
  ON chat_histories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_histories_insert_own"
  ON chat_histories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_histories_update_own"
  ON chat_histories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ==============================
-- 012_checklists.sql
-- ==============================

-- Tabela de checklists (cada usuário tem os seus)
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens de cada checklist
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);

-- RLS: habilitar nas duas tabelas
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para checklists (cada usuário vê só os seus)
CREATE POLICY "checklists_select" ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklists_insert" ON checklists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklists_update" ON checklists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklists_delete" ON checklists FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para checklist_items (cada usuário vê só os seus)
CREATE POLICY "checklist_items_select" ON checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklist_items_insert" ON checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklist_items_update" ON checklist_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "checklist_items_delete" ON checklist_items FOR DELETE USING (auth.uid() = user_id);


-- ==============================
-- 012_collaborators.sql
-- ==============================

-- Migration 012: Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS collaborators (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  status     TEXT NOT NULL DEFAULT 'ativo'
               CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_collaborators"
  ON collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_insert_collaborators"
  ON collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_update_collaborators"
  ON collaborators FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_delete_collaborators"
  ON collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );


-- ==============================
-- 013_collaborators_salary.sql
-- ==============================

-- Migration 013: Adicionar campos de salário em collaborators
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS salary_frequency TEXT
    CHECK (salary_frequency IN ('mensal', 'quinzenal', 'semanal')),
  ADD COLUMN IF NOT EXISTS salary_day INTEGER
    CHECK (salary_day BETWEEN 1 AND 31);


-- ==============================
-- 014_collaborator_auth.sql
-- ==============================

-- Migration 014: Suporte a autenticação de colaboradores

-- Adicionar coluna user_id na tabela collaborators (vincula ao Supabase Auth)
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para busca por user_id
CREATE INDEX IF NOT EXISTS collaborators_user_id_idx ON collaborators(user_id);

-- RLS: colaborador pode ler o próprio registro
CREATE POLICY "Collaborator can read own record"
  ON collaborators
  FOR SELECT
  USING (auth.uid() = user_id);


-- ==============================
-- 016_collaborator_finance.sql
-- ==============================

-- Migration 016: Financeiro pessoal do colaborador

CREATE TABLE IF NOT EXISTS collaborator_finance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'gasto')),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS collaborator_finance_collaborator_id_idx
  ON collaborator_finance(collaborator_id);

-- RLS: somente o próprio colaborador acessa
ALTER TABLE collaborator_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborator owns finance"
  ON collaborator_finance
  FOR ALL
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );


-- ==============================
-- 017_collaborator_integrations.sql
-- ==============================

-- Migration 017: Integrações do colaborador

CREATE TABLE IF NOT EXISTS collaborator_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'openai',
    'elevenlabs',
    'whatsapp',
    'meta_ads',
    'google_ads',
    'google_drive'
  )),
  api_key TEXT,
  extra_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collaborator_id, type)
);

-- Índice
CREATE INDEX IF NOT EXISTS collaborator_integrations_collaborator_id_idx
  ON collaborator_integrations(collaborator_id);

-- RLS: somente o próprio colaborador acessa
ALTER TABLE collaborator_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborator owns integrations"
  ON collaborator_integrations
  FOR ALL
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );


-- ==============================
-- 018_fix_profile_role_constraint.sql
-- ==============================

-- Migration 018: Atualizar constraint de role na tabela profiles para incluir 'collaborator'

-- 1. Remover a constraint antiga
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Adicionar a nova constraint com 'collaborator' incluído
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'manager', 'collaborator'));


-- ==============================
-- 019_collaborator_campaigns_rls.sql
-- ==============================

-- Colaborador pode ver todas as campanhas (assim como o admin)
CREATE POLICY "Colaborador vê todas as campanhas"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );


-- ==============================
-- 020_collaborator_clients_rls.sql
-- ==============================

-- Colaborador pode ver todos os clientes (apenas leitura, para exibir nomes nas campanhas)
CREATE POLICY "Colaborador vê todos os clientes"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );


-- ==============================
-- 021_collaborator_own_clients_rls.sql
-- ==============================

-- Permitir que colaboradores criem seus próprios clientes
CREATE POLICY "Colaborador pode criar clientes"
  ON clients FOR INSERT
  WITH CHECK (
    auth.uid() = manager_id AND
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );

-- Permitir que colaboradores vejam apenas seus próprios clientes (ou todos se já houver política de leitura global, mas esta garante o acesso aos dele)
CREATE POLICY "Colaborador gerencia seus próprios clientes"
  ON clients FOR ALL
  USING (
    auth.uid() = manager_id AND
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );


-- ==============================
-- 023_fix_clients_missing_columns.sql
-- ==============================

-- Adiciona colunas referenciadas no useClientes.ts e na página de clientes
-- que não existem na tabela clients em nenhuma migration
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS payment_day INTEGER;


-- ==============================
-- 024_fix_campaigns_selected_metrics.sql
-- ==============================

-- Adiciona a coluna selected_metrics à tabela campaigns
-- A migration 010 continha código React por engano e nunca criou esta coluna
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS selected_metrics JSONB DEFAULT '[]'::jsonb;


-- ==============================
-- 040_new_tasks_system.sql
-- ==============================

-- Migration 040: Novo Sistema de Tarefas do Zero
-- Foco em privacidade e controle por colaborador

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baixa', 'media', 'alta')),
  
  -- Quem criou a tarefa (pode ser admin ou o próprio colaborador)
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Quem deve executar a tarefa
  assigned_to   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Datas
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 1. ADMINS: Podem ver, criar, editar e excluir QUALQUER tarefa
CREATE POLICY "admins_full_access_tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 2. COLABORADORES: Podem ver tarefas atribuídas a eles OU criadas por eles
CREATE POLICY "collaborators_view_own_tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = assigned_to OR auth.uid() = created_by
  );

-- 3. COLABORADORES: Podem criar suas próprias tarefas
CREATE POLICY "collaborators_insert_own_tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- 4. COLABORADORES: Podem editar suas próprias tarefas ou as que foram atribuídas a eles (para mudar status)
CREATE POLICY "collaborators_update_own_tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to OR auth.uid() = created_by
  )
  WITH CHECK (
    auth.uid() = assigned_to OR auth.uid() = created_by
  );

-- 5. COLABORADORES: Podem excluir apenas as tarefas que eles mesmos criaram
CREATE POLICY "collaborators_delete_own_tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() = created_by
  );


-- ==============================
-- 041_kanban_status_update.sql
-- ==============================

-- Migration 041: Atualizar status para Kanban (A Fazer, Em Andamento, Finalizada)

-- 1. Remover a constraint antiga
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 2. Adicionar a nova constraint com os status solicitados
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada'));

-- 3. Atualizar tarefas existentes para os novos status (se houver)
UPDATE tasks SET status = 'a_fazer' WHERE status = 'pendente';
UPDATE tasks SET status = 'finalizada' WHERE status IN ('concluida', 'cancelada');

-- 4. Garantir que o valor padrão seja 'a_fazer'
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'a_fazer';


-- ==============================
-- 042_notifications_system.sql
-- ==============================

-- Migration 042: Sistema de Notificações em Tempo Real (Ajustado)

-- Garantir que a tabela tenha a estrutura que o hook useNotificacoes espera
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'geral', -- 'task', 'vencimento_5dias', etc
  titulo        TEXT NOT NULL,
  mensagem      TEXT NOT NULL,
  lida          BOOLEAN NOT NULL DEFAULT FALSE,
  finance_id    UUID, -- Opcional: link para financeiro
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;

-- Usuários só veem suas próprias notificações
CREATE POLICY "users_view_own_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem marcar suas notificações como lidas
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para criar notificação quando uma tarefa for atribuída a um colaborador
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se a tarefa for atribuída a alguém que NÃO seja quem a criou (ex: Admin atribuindo a Colaborador)
  IF NEW.assigned_to != NEW.created_by THEN
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.assigned_to,
      'Nova Tarefa Atribuída',
      'Você recebeu uma nova tarefa: ' || NEW.title,
      'geral'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger para notificar quando o status da tarefa mudar
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifica o criador da tarefa quando o status muda (se não foi o próprio criador que mudou)
  IF OLD.status != NEW.status AND NEW.created_by != auth.uid() THEN
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.created_by,
      'Status de Tarefa Atualizado',
      'A tarefa "' || NEW.title || '" foi movida para ' || NEW.status,
      'geral'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_status_changed ON tasks;
CREATE TRIGGER on_task_status_changed
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_change();


-- ==============================
-- 043_advanced_checklists.sql
-- ==============================

-- Migration 043: Checklists Avançados com Recorrência e Reset

-- Adicionar colunas de recorrência e status à tabela checklists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('once', 'daily', 'weekly'));
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed'));

-- Função para verificar se todos os itens estão concluídos e atualizar o status da lista
CREATE OR REPLACE FUNCTION public.update_checklist_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se todos os itens do checklist estiverem marcados como 'completed = true'
  IF NOT EXISTS (
    SELECT 1 FROM public.checklist_items 
    WHERE checklist_id = NEW.checklist_id AND completed = false
  ) THEN
    UPDATE public.checklists SET status = 'completed' WHERE id = NEW.checklist_id;
  ELSE
    UPDATE public.checklists SET status = 'pending' WHERE id = NEW.checklist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar status do checklist quando um item for alterado
DROP TRIGGER IF EXISTS on_checklist_item_change ON checklist_items;
CREATE TRIGGER on_checklist_item_change
  AFTER UPDATE OF completed OR INSERT OR DELETE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_checklist_status();

-- Função para resetar checklists diários/semanais (pode ser chamada via API ou Edge Function)
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists()
RETURNS void AS $$
BEGIN
  -- Reset Diário: Se passou de 24h
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE recurrence = 'daily' 
    AND last_reset_at < NOW() - INTERVAL '24 hours'
  );

  -- Reset Semanal: Se passou de 7 dias
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE recurrence = 'weekly' 
    AND last_reset_at < NOW() - INTERVAL '7 days'
  );

  -- Atualizar o timestamp de reset
  UPDATE public.checklists
  SET last_reset_at = NOW(), status = 'pending'
  WHERE (recurrence = 'daily' AND last_reset_at < NOW() - INTERVAL '24 hours')
     OR (recurrence = 'weekly' AND last_reset_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================
-- 044_checklists_days_recurrence.sql
-- ==============================

-- Migration 044: Checklists com Recorrência por Dias da Semana

-- Adicionar coluna para armazenar os dias da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS recurrence_days INT[] DEFAULT '{}';

-- Atualizar a função de reset para considerar os dias da semana
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists_by_day()
RETURNS void AS $$
DECLARE
  current_day INT;
BEGIN
  -- Obter o dia da semana atual (0-6, onde 0 é Domingo no PostgreSQL 'dow')
  current_day := EXTRACT(DOW FROM NOW())::INT;

  -- Resetar checklists que estão configurados para o dia de hoje e que ainda não foram resetados hoje
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE current_day = ANY(recurrence_days)
    AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL)
  );

  -- Atualizar o timestamp de reset e o status das listas resetadas hoje
  UPDATE public.checklists
  SET last_reset_at = NOW(), status = 'pending'
  WHERE current_day = ANY(recurrence_days)
  AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================
-- 045_auto_escalate_task_priority.sql
-- ==============================

-- Função para aumentar a prioridade das tarefas após 24 horas
CREATE OR REPLACE FUNCTION public.auto_escalate_task_priority()
RETURNS void AS $$
BEGIN
  -- Escalar de 'baixa' para 'media' tarefas criadas há mais de 24 horas
  UPDATE public.tasks
  SET priority = 'media'
  WHERE priority = 'baixa'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'media' para 'alta' tarefas criadas há mais de 24 horas
  UPDATE public.tasks
  SET priority = 'alta'
  WHERE priority = 'media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissão para execução
GRANT EXECUTE ON FUNCTION public.auto_escalate_task_priority() TO authenticated;


-- ==============================
-- 046_add_urgent_priority.sql
-- ==============================

-- 1. Atualizar a constraint de check na coluna priority para incluir 'urgente'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 2. Atualizar a função de escalonamento automático para incluir o nível 'urgente'
CREATE OR REPLACE FUNCTION public.auto_escalate_task_priority()
RETURNS void AS $$
BEGIN
  -- Escalar de 'baixa' para 'media'
  UPDATE public.tasks
  SET priority = 'media'
  WHERE priority = 'baixa'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'media' para 'alta'
  UPDATE public.tasks
  SET priority = 'alta'
  WHERE priority = 'media'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';

  -- Escalar de 'alta' para 'urgente'
  UPDATE public.tasks
  SET priority = 'urgente'
  WHERE priority = 'alta'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND status != 'finalizada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================
-- 047_add_pending_status.sql
-- ==============================

-- Atualizar a constraint de check na coluna status para incluir 'pendente'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pendente', 'a_fazer', 'em_andamento', 'finalizada'));


-- ==============================
-- 048_admin_view_collaborator_pendencies.sql
-- ==============================

-- Atualizar a política de visualização para que o administrador possa ver TODAS as pendências
-- Independentemente de quem criou ou a quem está atribuída.

DROP POLICY IF EXISTS "Users can view their own tasks or tasks assigned to them" ON public.tasks;

CREATE POLICY "Users can view relevant tasks" ON public.tasks
  FOR SELECT
  USING (
    -- O usuário pode ver se ele criou a tarefa
    auth.uid() = created_by 
    OR 
    -- O usuário pode ver se a tarefa foi atribuída a ele
    auth.uid() = assigned_to
    OR 
    -- O administrador pode ver se o status for 'pendente'
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    OR
    -- O administrador pode ver tarefas atribuídas a qualquer um
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Nota: Como o administrador já deve ter permissão total, vamos simplificar
-- Garantindo que o administrador veja TUDO na tabela tasks.

DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;

CREATE POLICY "Admins can view everything, others only their own" ON public.tasks
  FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR 
    (auth.uid() = created_by)
    OR 
    (auth.uid() = assigned_to)
  );


-- ==============================
-- 049_auto_task_notifications.sql
-- ==============================

-- Função para criar notificações automáticas e gerenciar o retorno de tarefas resolvidas
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Notificar quando uma tarefa é ATRIBUÍDA a alguém novo
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    target_user_id := NEW.assigned_to;
    -- Não notificar se o criador for o mesmo que o atribuído
    IF NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (target_user_id, 'Nova tarefa atribuída', 'Você recebeu a tarefa: ' || NEW.title, 'task', '/tarefas');
    END IF;
  END IF;

  -- 2. Fluxo de Retorno de Pendência: Quando o status muda de 'pendente' para 'a_fazer'
  -- A tarefa deve ser reatribuída ao criador original para ele continuar o trabalho
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'a_fazer') THEN
    -- Reatribuir ao criador
    NEW.assigned_to := NEW.created_by;
    
    -- Notificar o criador que a pendência foi resolvida e a tarefa voltou para ele
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.created_by, 'Pendência resolvida!', 'A tarefa "' || NEW.title || '" foi resolvida e voltou para o seu quadro.', 'task', '/colaborador/tarefas');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a função
DROP TRIGGER IF EXISTS on_task_change_notification ON public.tasks;
CREATE TRIGGER on_task_change_notification
  BEFORE INSERT OR UPDATE ON public.tasks -- Mudado para BEFORE para permitir alteração de NEW.assigned_to
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_notification();


-- ==============================
-- 050_fix_profiles_visibility.sql
-- ==============================

-- Garantir que todos os usuários autenticados possam ver os perfis (necessário para a lista de atribuição)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);


-- ==============================
-- 051_fix_notifications_and_deletion.sql
-- ==============================

-- 1. Corrigir a Função de Notificação (Removendo o campo 'title' que não existe na tabela notifications)
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
BEGIN
  -- Notificar quando uma tarefa é ATRIBUÍDA a alguém novo
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    IF NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, message, type, link)
      VALUES (NEW.assigned_to, 'Nova tarefa: ' || NEW.title, 'task', '/tarefas');
    END IF;
  END IF;

  -- Retorno Automático: Quando move de 'pendente' para 'a_fazer'
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'a_fazer') THEN
    NEW.assigned_to := NEW.created_by;
    INSERT INTO public.notifications (user_id, message, type, link)
    VALUES (NEW.created_by, 'Pendência resolvida: ' || NEW.title, 'task', '/colaborador/tarefas');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Liberar Permissão de Exclusão para Administradores
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
CREATE POLICY "Admins can delete any task" ON public.tasks
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ==============================
-- 052_unlock_tasks_management.sql
-- ==============================

-- 1. LIBERAR EXCLUSÃO: Colaboradores apagam as suas, Admin apaga todas
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks" ON public.tasks
  FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
  );

-- 2. DESTRAVAR MOVIMENTAÇÃO: Permitir que o Admin e o Atribuído atualizem a tarefa
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;

CREATE POLICY "Users can update tasks" ON public.tasks
  FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
    OR (auth.uid() = assigned_to)
  )
  WITH CHECK (true);

-- 3. AJUSTE NA DEVOLUÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
BEGIN
  -- Se moveu de 'pendente' para qualquer outro status, devolve para o criador
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status != 'pendente') THEN
    NEW.assigned_to := NEW.created_by;
    
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.created_by, 
      'Pendência resolvida!', 
      'A tarefa "' || NEW.title || '" foi liberada e voltou para você.', 
      'geral'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================
-- 053_add_drive_and_auto_cleanup.sql
-- ==============================

-- 1. Adicionar campo opcional para link do Google Drive
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS drive_link TEXT;

-- 2. Função para limpeza automática de tarefas finalizadas há mais de 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_finished_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.tasks
  WHERE status = 'finalizada'
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Para automação total, o usuário deve configurar um Cron Job no painel do Supabase 
-- ou usar o pg_cron se disponível: SELECT cron.schedule('0 0 * * *', 'SELECT cleanup_old_finished_tasks()');


-- ==============================
-- 054_add_checklist_position.sql
-- ==============================

-- Adicionar coluna de posição na tabela de checklists
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Adicionar coluna de posição na tabela de itens de checklist
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Atualizar posições existentes (opcional, mas bom para consistência)
WITH ranked_checklists AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 as new_pos
  FROM public.checklists
)
UPDATE public.checklists
SET position = ranked_checklists.new_pos
FROM ranked_checklists
WHERE public.checklists.id = ranked_checklists.id;

WITH ranked_items AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY checklist_id ORDER BY created_at ASC) - 1 as new_pos
  FROM public.checklist_items
)
UPDATE public.checklist_items
SET position = ranked_items.new_pos
FROM ranked_items
WHERE public.checklist_items.id = ranked_items.id;


-- ==============================
-- 055_fix_checklist_permissions.sql
-- ==============================

-- 1. Garantir que as colunas de posição existam
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Atualizar políticas de RLS para permitir atualização das colunas de posição
-- Checklists
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklists;
CREATE POLICY "Users can update their own checklists" ON public.checklists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checklist Items
DROP POLICY IF EXISTS "Users can update items of their checklists" ON public.checklist_items;
CREATE POLICY "Users can update items of their checklists" ON public.checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  );


-- ==============================
-- 056_fix_checklist_rls_and_upsert.sql
-- ==============================

-- Migration 056: Corrige políticas RLS conflitantes que impedem o UPDATE de position

-- 1. Remover TODAS as políticas antigas de UPDATE (por nome, para garantir limpeza total)
DROP POLICY IF EXISTS "checklists_update" ON public.checklists;
DROP POLICY IF EXISTS "checklists_update_policy" ON public.checklists;
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.checklists;
DROP POLICY IF EXISTS "checklists_personal_access" ON public.checklists;

DROP POLICY IF EXISTS "checklist_items_update" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_update_policy" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can update items of their checklists" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_personal_access" ON public.checklist_items;

-- 2. Recriar políticas de UPDATE limpas e claras

-- Checklists: o usuário pode atualizar apenas os próprios checklists
CREATE POLICY "Users can update their own checklists" ON public.checklists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checklist Items: o usuário pode atualizar itens dos seus próprios checklists
CREATE POLICY "Users can update items of their checklists" ON public.checklist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.user_id = auth.uid()
    )
  );


-- ==============================
-- 999_master_fix_tasks.sql
-- ==============================

-- SCRIPT MESTRE DE CORREÇÃO DE TAREFAS
-- Este script garante que o banco de dados aceite 'urgente' e 'pendente'

-- 1. Atualizar Status Permitidos
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pendente', 'a_fazer', 'em_andamento', 'finalizada'));

-- 2. Atualizar Prioridades Permitidas
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 3. Garantir Visibilidade de Perfis
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 4. Garantir Visibilidade de Tarefas (Admin vê tudo, Colaborador vê o que criou ou recebeu)
DROP POLICY IF EXISTS "Admins can view everything, others only their own" ON public.tasks;
CREATE POLICY "Admins can view everything, others only their own" ON public.tasks
  FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
    OR (auth.uid() = assigned_to)
  );

-- 5. Garantir Permissão de Inserção
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);


-- ==============================
-- enable_realtime.sql
-- ==============================

-- ====================================================================
-- SCRIPT PARA ATIVAR O REALTIME (TEMPO REAL) NO SUPABASE
-- Execute este script para que as tarefas e notificações apareçam na hora!
-- ====================================================================

-- 1. Habilitar o Realtime para a tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Habilitar o Realtime para a tabela de tarefas
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Caso a publicação não exista (raro), use este comando antes:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;


-- ==============================
-- fix_checklists_privacy.sql
-- ==============================

-- 1. Limpar políticas antigas de checklists e itens
DROP POLICY IF EXISTS "checklists_select_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_insert_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_update_policy" ON checklists;
DROP POLICY IF EXISTS "checklists_delete_policy" ON checklists;
DROP POLICY IF EXISTS "checklist_items_select_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_update_policy" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete_policy" ON checklist_items;

-- 2. Garantir que as tabelas tenham RLS habilitado
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- 3. NOVAS POLÍTICAS: PRIVACIDADE TOTAL (Cada um vê apenas o seu)

-- Checklists
CREATE POLICY "checklists_personal_access" ON checklists
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Checklist Items (Acesso via o checklist pai)
CREATE POLICY "checklist_items_personal_access" ON checklist_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_items.checklist_id
    AND checklists.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_items.checklist_id
    AND checklists.user_id = auth.uid()
  )
);

-- 4. Permissões de acesso
GRANT ALL ON TABLE checklists TO postgres, service_role, authenticated;
GRANT ALL ON TABLE checklist_items TO postgres, service_role, authenticated;


-- ==============================
-- fix_checklists_rpc.sql
-- ==============================

-- 1. Criar ou substituir a função de reset por dia da semana
CREATE OR REPLACE FUNCTION public.reset_recurring_checklists_by_day()
RETURNS void AS $$
DECLARE
  current_day INT;
BEGIN
  -- Obter o dia da semana atual (0=Domingo, 1=Segunda, ..., 6=Sábado)
  current_day := EXTRACT(DOW FROM NOW())::INT;

  -- 1. Resetar os itens dos checklists que estão marcados para o dia de hoje
  -- e que ainda não foram resetados hoje
  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists 
    WHERE current_day = ANY(recurrence_days)
    AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL)
  );

  -- 2. Atualizar o status e o timestamp de reset dos checklists
  -- Forçamos o status para 'pending' para que elas subam para o topo
  UPDATE public.checklists
  SET 
    status = 'pending',
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE current_day = ANY(recurrence_days)
  AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Dar permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO service_role;


-- ==============================
-- fix_tasks_privacy.sql
-- ==============================

-- ====================================================================
-- SCRIPT DE PRIVACIDADE TOTAL PARA COLABORADORES
-- Garante que tarefas criadas por colaboradores para si mesmos sejam INVISÍVEIS para o Admin
-- ====================================================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "admin_full_access" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- 2. POLÍTICA PARA ADMINS
-- Admin vê apenas tarefas que ele criou OU que ele atribuiu a alguém
-- Admin NÃO vê tarefas criadas por colaboradores para si mesmos
CREATE POLICY "admin_view_restricted" ON tasks FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid()) -- Admin só vê o que ele mesmo criou (atribuído a ele ou a outros)
);

CREATE POLICY "admin_all_actions_own" ON tasks FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid())
);

-- 3. POLÍTICA PARA COLABORADORES
-- Colaborador vê o que criou para si OU o que o Admin atribuiu a ele
CREATE POLICY "collab_view_tasks" ON tasks FOR SELECT TO authenticated 
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- Colaborador pode criar suas próprias tarefas
CREATE POLICY "collab_insert_tasks" ON tasks FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = created_by
);

-- Colaborador pode atualizar suas tarefas ou as atribuídas a ele
CREATE POLICY "collab_update_tasks" ON tasks FOR UPDATE TO authenticated 
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- Colaborador pode excluir apenas o que criou
CREATE POLICY "collab_delete_tasks" ON tasks FOR DELETE TO authenticated 
USING (
  auth.uid() = created_by
);

-- 4. Garantir permissões
GRANT ALL ON TABLE tasks TO postgres, service_role, authenticated;


-- ==============================
-- fix_tasks_system.sql
-- ==============================

-- ====================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DO SISTEMA DE TAREFAS
-- Aplique este script no SQL Editor do seu painel Supabase
-- ====================================================================

-- 1. Limpeza de Segurança (Remover políticas antigas que podem estar conflitando)
DROP POLICY IF EXISTS "admins_full_access_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_view_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_insert_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_update_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_delete_own_tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- 2. Garantir que a tabela tenha a estrutura correta
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'a_fazer'
                CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada')),
  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baixa', 'media', 'alta')),
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 4. NOVAS POLÍTICAS SIMPLIFICADAS E ROBUSTAS

-- A) ADMINS: Controle total
CREATE POLICY "admin_all_tasks"
ON tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- B) COLABORADORES: Ver apenas o que lhes pertence ou o que criaram
CREATE POLICY "collab_select_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- C) COLABORADORES: Criar tarefas (o created_by deve ser o próprio usuário)
CREATE POLICY "collab_insert_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- D) COLABORADORES: Atualizar tarefas (apenas as suas ou atribuídas)
CREATE POLICY "collab_update_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- E) COLABORADORES: Excluir apenas o que criaram
CREATE POLICY "collab_delete_tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
);

-- 5. Garantir permissões de acesso ao esquema public
GRANT ALL ON TABLE tasks TO postgres, service_role, authenticated;

-- MENSAGEM DE SUCESSO: Sistema de tarefas resetado e políticas aplicadas!

