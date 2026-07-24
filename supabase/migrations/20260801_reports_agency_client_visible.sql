-- Mesmo ajuste de 20260801_agency_clients_shared_access.sql, mas pra
-- reports: a política antiga (`reports_select_company_admin`) exigia
-- is_admin(), então nenhum colaborador via relatório de cliente nenhum
-- (só os próprios, via reports_select_own). Cliente da agência (manager_id
-- é admin/manager) precisa ter os relatórios visíveis pra todo mundo da
-- empresa, igual campanhas; cliente do próprio colaborador continua só dele.
DROP POLICY IF EXISTS "reports_select_company_admin" ON reports;
CREATE POLICY "reports_select_company_shared" ON reports FOR SELECT
  USING (
    company_id = get_current_company_id() AND (
      (client_id IS NULL AND is_admin())
      OR EXISTS (
        SELECT 1 FROM clients WHERE clients.id = reports.client_id AND (
          clients.manager_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = clients.manager_id AND profiles.role = ANY (ARRAY['admin','manager']))
        )
      )
    )
  );
