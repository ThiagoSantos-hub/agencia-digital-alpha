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

