-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Migration 019
-- Módulo: Relatórios de Anúncios
-- ==========================================

-- Garantir que a função de atualização de data exista
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Tabela de Relatórios
CREATE TABLE IF NOT EXISTS reports (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT        NOT NULL,
  canal             TEXT        NOT NULL CHECK (canal IN ('meta', 'google')),
  frequencia        TEXT        NOT NULL CHECK (frequencia IN ('diario', 'semanal', 'mensal')),
  periodo           TEXT        NOT NULL CHECK (periodo IN ('dia_anterior', 'ultima_semana', 'ultimo_mes', 'ultimos_7_dias', 'ultimos_30_dias')),
  recebedor_tipo    TEXT        NOT NULL CHECK (recebedor_tipo IN ('privado', 'grupo')),
  recebedor_numero  TEXT        NOT NULL,
  mensagem_template TEXT        NOT NULL,
  horario_envio     TIME        NOT NULL DEFAULT '08:00',
  dias_semana       TEXT[]      DEFAULT NULL,
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  proximo_envio     TIMESTAMPTZ,
  client_id         UUID        REFERENCES clients(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para Reports (Admin)
DROP POLICY IF EXISTS "reports_select_admin" ON reports;
CREATE POLICY "reports_select_admin" ON reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "reports_insert_admin" ON reports;
CREATE POLICY "reports_insert_admin" ON reports FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "reports_delete_admin" ON reports;
CREATE POLICY "reports_delete_admin" ON reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger para updated_at em reports
DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Tabela de Histórico de Relatórios
CREATE TABLE IF NOT EXISTS report_history (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id        UUID        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  enviado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mensagem_enviada TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro')),
  erro_detalhe     TEXT
);

ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para Histórico (Admin)
DROP POLICY IF EXISTS "report_history_select_admin" ON report_history;
CREATE POLICY "report_history_select_admin" ON report_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "report_history_insert_admin" ON report_history;
CREATE POLICY "report_history_insert_admin" ON report_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Tabela de Alertas
CREATE TABLE IF NOT EXISTS alerts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT        NOT NULL,
  tipo              TEXT        NOT NULL CHECK (tipo IN ('saldo_minimo', 'erro_conta')),
  canal             TEXT        NOT NULL CHECK (canal IN ('meta', 'google')),
  conta_anuncio     TEXT        NOT NULL,
  saldo_minimo      NUMERIC(10,2),
  recebedor_tipo    TEXT        NOT NULL CHECK (recebedor_tipo IN ('privado', 'grupo')),
  recebedor_numero  TEXT        NOT NULL,
  mensagem_template TEXT        NOT NULL,
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para Alertas (Admin)
DROP POLICY IF EXISTS "alerts_select_admin" ON alerts;
CREATE POLICY "alerts_select_admin" ON alerts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "alerts_insert_admin" ON alerts;
CREATE POLICY "alerts_insert_admin" ON alerts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "alerts_update_admin" ON alerts;
CREATE POLICY "alerts_update_admin" ON alerts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "alerts_delete_admin" ON alerts;
CREATE POLICY "alerts_delete_admin" ON alerts FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger para updated_at em alerts
DROP TRIGGER IF EXISTS alerts_updated_at ON alerts;
CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
