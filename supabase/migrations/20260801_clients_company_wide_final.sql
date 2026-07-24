-- Decisão final: colaborador é funcionário da empresa, ponto. Não existe
-- mais "cliente privado do colaborador" nem "financeiro individual" de
-- cliente, tudo que ele cadastra é dado da empresa, visível pra qualquer
-- um da mesma empresa (mesmo comportamento de antes de toda a leva de
-- privacidade de hoje, 20260801_clients_full_privacy.sql em diante).

DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_company" ON clients FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_company" ON clients FOR UPDATE
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "clients_delete_own" ON clients;
CREATE POLICY "clients_delete_company_admin" ON clients FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());

DROP POLICY IF EXISTS "campaigns_select_own_client" ON campaigns;
CREATE POLICY "campaigns_select_company" ON campaigns FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "campaign_metrics_select_own_client" ON campaign_metrics;
CREATE POLICY "campaign_metrics_select_company" ON campaign_metrics FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "reports_select_company_shared" ON reports;
CREATE POLICY "reports_select_company_shared" ON reports FOR SELECT
  USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "client_metrics_daily_select_own_client" ON client_metrics_daily;
CREATE POLICY "client_metrics_daily_select_company" ON client_metrics_daily FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE company_id = get_current_company_id()));

DROP POLICY IF EXISTS "client_ai_analyses_select_own_client" ON client_ai_analyses;
CREATE POLICY "client_ai_analyses_select_company" ON client_ai_analyses FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE company_id = get_current_company_id()));

CREATE OR REPLACE VIEW clients_directory AS
  SELECT id, name, company, status, company_id, meta_ad_account_id
  FROM clients
  WHERE company_id = get_current_company_id();

-- finances e reports_select_own/reports_select_own_personal não mudam:
-- financeiro nunca teve visão ampla pro colaborador (só admin, ou o
-- controle pessoal de gasto de cada um, que é outra coisa e continua igual).
