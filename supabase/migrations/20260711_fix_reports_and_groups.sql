-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Correção Emergencial
-- Data: 11/07/2026
-- ==========================================

-- 1. Remover restrições antigas da tabela reports para permitir novos períodos
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_periodo_check;
ALTER TABLE reports ADD CONSTRAINT reports_periodo_check 
  CHECK (periodo IN ('dia_anterior', 'ontem', 'ultima_semana', 'ultimo_mes', 'ultimos_3_dias', 'ultimos_7_dias', 'ultimos_30_dias', 'personalizado'));

-- 2. Garantir que colaboradores possam gerenciar seus próprios relatórios
-- (Até agora só havia políticas para admin)

DROP POLICY IF EXISTS "reports_select_collaborator" ON reports;
CREATE POLICY "reports_select_collaborator" ON reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_insert_collaborator" ON reports;
CREATE POLICY "reports_insert_collaborator" ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_update_collaborator" ON reports;
CREATE POLICY "reports_update_collaborator" ON reports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_delete_collaborator" ON reports;
CREATE POLICY "reports_delete_collaborator" ON reports FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Garantir que colaboradores possam ver o histórico de seus relatórios
DROP POLICY IF EXISTS "report_history_select_collaborator" ON report_history;
CREATE POLICY "report_history_select_collaborator" ON report_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM reports WHERE reports.id = report_history.report_id AND reports.user_id = auth.uid()));

-- 4. Limpeza de Grupos Fantasmas (Ajuste na tabela de cache)
-- Adicionamos uma coluna para marcar se o grupo é "real" ou não
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN DEFAULT false;
