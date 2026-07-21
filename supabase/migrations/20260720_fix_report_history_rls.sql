-- ==========================================
-- Corrige RLS de report_history:
-- 1) colaboradores nunca conseguiam ver o histórico dos próprios relatórios
--    (a policy de SELECT só liberava para role = 'admin', sem exceção para o
--    dono do relatório).
-- 2) a policy de admin não verificava company_id: qualquer admin de qualquer
--    empresa conseguia ler o histórico de envio (mensagens, números de
--    WhatsApp) de TODAS as outras empresas do sistema.
-- ==========================================

DROP POLICY IF EXISTS "report_history_select_admin" ON report_history;
DROP POLICY IF EXISTS "report_history_insert_admin" ON report_history;
DROP POLICY IF EXISTS "report_history_select_own" ON report_history;
DROP POLICY IF EXISTS "report_history_select_company_admin" ON report_history;
DROP POLICY IF EXISTS "report_history_insert_company_admin" ON report_history;

CREATE POLICY "report_history_select_own" ON report_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_history.report_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "report_history_select_company_admin" ON report_history FOR SELECT
  USING (
    is_admin()
    AND EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_history.report_id
        AND r.company_id = get_current_company_id()
    )
  );

CREATE POLICY "report_history_insert_company_admin" ON report_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_history.report_id
        AND r.company_id = get_current_company_id()
        AND is_admin()
    )
  );
