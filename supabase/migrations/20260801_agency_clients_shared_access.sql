-- Ajuste fino da privacidade de cliente (20260801_clients_full_privacy.sql):
-- cliente cadastrado pela própria agência (manager_id é admin/manager) é
-- dado da empresa, e colaborador precisa conseguir trabalhar nele de
-- verdade (ver/mexer em campanhas, ver acompanhamento), não só ver o nome.
-- Continua 100% privado apenas o que o COLABORADOR cadastra pra si mesmo.
--
-- Regra: visível se manager_id = auth.uid() (é seu) OU o dono do cliente é
-- admin/manager (é da agência, compartilhado com todo mundo da empresa).

CREATE OR REPLACE VIEW clients_directory AS
  SELECT id, name, company, status, company_id, meta_ad_account_id
  FROM clients
  WHERE company_id = get_current_company_id()
    AND (
      manager_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
    );

DROP POLICY IF EXISTS "campaigns_select_own_client" ON campaigns;
CREATE POLICY "campaigns_select_own_client" ON campaigns FOR SELECT
  USING (
    company_id = get_current_company_id() AND EXISTS (
      SELECT 1 FROM clients WHERE clients.id = campaigns.client_id AND (
        clients.manager_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
      )
    )
  );

DROP POLICY IF EXISTS "campaign_metrics_select_own_client" ON campaign_metrics;
CREATE POLICY "campaign_metrics_select_own_client" ON campaign_metrics FOR SELECT
  USING (
    company_id = get_current_company_id() AND EXISTS (
      SELECT 1 FROM campaigns JOIN clients ON clients.id = campaigns.client_id
      WHERE campaigns.id = campaign_metrics.campaign_id AND (
        clients.manager_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
      )
    )
  );

DROP POLICY IF EXISTS "client_metrics_daily_select_company" ON client_metrics_daily;
CREATE POLICY "client_metrics_daily_select_own_client" ON client_metrics_daily FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = get_current_company_id() AND (
        manager_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
      )
    )
  );

DROP POLICY IF EXISTS "client_ai_analyses_select_company" ON client_ai_analyses;
CREATE POLICY "client_ai_analyses_select_own_client" ON client_ai_analyses FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = get_current_company_id() AND (
        manager_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
      )
    )
  );

-- finances/reports não mudam aqui: continuam is_admin() + dono do cliente
-- (colaborador nunca teve visão ampla de financeiro/relatório da empresa,
-- só dos próprios que ele mesmo criou via reports_select_own/finances_select_own_personal).
