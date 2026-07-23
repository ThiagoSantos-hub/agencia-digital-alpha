-- ==========================================
-- Corrige RLS de clients: colaborador só edita/lê por completo os clientes
-- que gerencia, não qualquer cliente da empresa
-- ==========================================
-- Antes, clients_select_company/clients_update_company só checavam
-- company_id, então qualquer colaborador conseguia ler e editar telefone,
-- e-mail, mensalidade e status de atraso de clientes de OUTROS
-- colaboradores, via chamada direta ao Supabase (bypassando o filtro que a
-- tela "Meus Clientes" só aplica no navegador). Admin e manager continuam
-- vendo/editando todos os clientes da empresa.

DROP POLICY IF EXISTS "clients_select_company" ON clients;
CREATE POLICY "clients_select_company" ON clients FOR SELECT
  USING (
    company_id = public.get_current_company_id()
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      OR manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "clients_update_company" ON clients;
CREATE POLICY "clients_update_company" ON clients FOR UPDATE
  USING (
    company_id = public.get_current_company_id()
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      OR manager_id = auth.uid()
    )
  );

-- View somente-leitura com colunas não-sensíveis (sem telefone, e-mail,
-- mensalidade, dia de pagamento, status de atraso), pra telas que precisam
-- listar TODOS os clientes da empresa por nome (ex: "Clientes da Agência" e
-- "Campanhas" no painel do colaborador, que agrupa campanhas por cliente e
-- usa o meta_ad_account_id) sem expor dado confidencial de clientes que não
-- são do colaborador logado. A view roda com o privilégio do dono (não do
-- usuário chamando), então enxerga todas as linhas da tabela base
-- independente da política restrita acima. O filtro de empresa é feito
-- aqui dentro, na própria view.
CREATE OR REPLACE VIEW public.clients_directory AS
SELECT id, name, company, status, company_id, meta_ad_account_id
FROM public.clients
WHERE company_id = public.get_current_company_id();

GRANT SELECT ON public.clients_directory TO authenticated;
