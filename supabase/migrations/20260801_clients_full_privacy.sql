-- Cliente cadastrado por um colaborador passa a ser 100% privado dele: nem o
-- admin da mesma agência vê, em nenhuma tela (Clientes, Financeiro,
-- Relatórios, Campanhas, Dashboard). Antes, `clients_select_company` dava
-- bypass pra role admin/manager, então o admin sempre viu todo mundo. Sem
-- isso, a regra fica simétrica: só quem tem manager_id = auth.uid() enxerga.
--
-- finances/reports/campaigns/campaign_metrics também precisam do mesmo
-- ownership check, hoje nenhuma delas filtra por dono do cliente, só por
-- company_id, então só trocar a RLS de clients não escondia nada (o embed
-- do PostgREST tipo select('*, clients(name)') só zera o campo aninhado
-- quando bloqueado, a linha principal de finances/reports/campaigns
-- continuaria vindo pro admin mesmo assim).
--
-- alerts fica de fora: não tem client_id nem qualquer FK pra clients (só
-- conta_anuncio em texto solto e user_id), não há como aplicar essa regra
-- lá, limitação real do schema, não lacuna desta migration.

DROP POLICY IF EXISTS "clients_select_company" ON clients;
CREATE POLICY "clients_select_own" ON clients FOR SELECT
  USING (company_id = get_current_company_id() AND manager_id = auth.uid());

DROP POLICY IF EXISTS "clients_update_company" ON clients;
CREATE POLICY "clients_update_own" ON clients FOR UPDATE
  USING (company_id = get_current_company_id() AND manager_id = auth.uid());

DROP POLICY IF EXISTS "clients_delete_company_admin" ON clients;
CREATE POLICY "clients_delete_own" ON clients FOR DELETE
  USING (company_id = get_current_company_id() AND manager_id = auth.uid());

DROP POLICY IF EXISTS "finances_select_company_admin" ON finances;
CREATE POLICY "finances_select_company_admin" ON finances FOR SELECT
  USING (
    company_id = get_current_company_id() AND is_admin() AND (
      client_id IS NULL OR EXISTS (
        SELECT 1 FROM clients WHERE clients.id = finances.client_id AND clients.manager_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "reports_select_company_admin" ON reports;
CREATE POLICY "reports_select_company_admin" ON reports FOR SELECT
  USING (
    company_id = get_current_company_id() AND is_admin() AND (
      client_id IS NULL OR EXISTS (
        SELECT 1 FROM clients WHERE clients.id = reports.client_id AND clients.manager_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "campaigns_select_company" ON campaigns;
CREATE POLICY "campaigns_select_own_client" ON campaigns FOR SELECT
  USING (
    company_id = get_current_company_id() AND EXISTS (
      SELECT 1 FROM clients WHERE clients.id = campaigns.client_id AND clients.manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaign_metrics_select_company" ON campaign_metrics;
CREATE POLICY "campaign_metrics_select_own_client" ON campaign_metrics FOR SELECT
  USING (
    company_id = get_current_company_id() AND EXISTS (
      SELECT 1 FROM campaigns JOIN clients ON clients.id = campaigns.client_id
      WHERE campaigns.id = campaign_metrics.campaign_id AND clients.manager_id = auth.uid()
    )
  );

-- clients_directory (usada em telas do colaborador pra listar clientes da
-- empresa inteira por nome) segue a mesma regra agora: só o próprio dono.
CREATE OR REPLACE VIEW clients_directory AS
  SELECT id, name, company, status, company_id, meta_ad_account_id
  FROM clients
  WHERE company_id = get_current_company_id() AND manager_id = auth.uid();
