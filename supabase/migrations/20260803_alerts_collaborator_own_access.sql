-- Alertas (inclusive Fundo de Cliente) eram restritos a is_admin(), então o
-- colaborador conseguia abrir o formulário mas o insert falhava silenciosamente
-- na RLS. Mesmo padrão já usado em reports: política "própria" por user_id
-- pra qualquer membro da empresa, mantendo a política company-wide do admin.
DROP POLICY IF EXISTS "alerts_select_company_admin" ON alerts;
CREATE POLICY "alerts_select_company_shared" ON alerts FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "alerts_insert_own" ON alerts;
CREATE POLICY "alerts_insert_own" ON alerts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "alerts_update_own" ON alerts;
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "alerts_delete_own" ON alerts;
CREATE POLICY "alerts_delete_own" ON alerts FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "client_fund_logs_select_company_admin" ON client_fund_logs;
CREATE POLICY "client_fund_logs_select_company_shared" ON client_fund_logs FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "client_fund_logs_insert_own" ON client_fund_logs;
CREATE POLICY "client_fund_logs_insert_own" ON client_fund_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());
