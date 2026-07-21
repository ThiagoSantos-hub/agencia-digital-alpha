-- companies foi criada em 20260719_multi_tenant_foundation.sql com RLS ativado e
-- ZERO policies pra usuários autenticados (intenção original: só service-role/rota
-- de super admin mexeria nela). Só que app/api/company/route.ts (identidade CONTRATADO
-- + esignature_provider) usa o client da sessão do usuário, não service-role — então
-- toda leitura/escrita nessa rota vinha sendo bloqueada silenciosamente pelo RLS desde
-- que a fundação multi-tenant foi aplicada. Isso também explica o botão de trocar
-- provedor de assinatura (Autentique/Assinafy) não "colar".

DROP POLICY IF EXISTS "companies_select_same_company" ON companies;
DROP POLICY IF EXISTS "companies_update_same_company" ON companies;

CREATE POLICY "companies_select_same_company" ON companies FOR SELECT
  USING (id = public.get_current_company_id() OR public.is_super_admin());

CREATE POLICY "companies_update_same_company" ON companies FOR UPDATE
  USING (id = public.get_current_company_id())
  WITH CHECK (id = public.get_current_company_id());
