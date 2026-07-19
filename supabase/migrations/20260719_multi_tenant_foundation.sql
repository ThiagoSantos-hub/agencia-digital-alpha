-- Fundação multi-tenant: empresas isoladas compartilhando o mesmo deploy/banco.
-- Escopo: profiles, clients, campaigns, campaign_metrics, integrations.
-- (agency_settings não existe no banco de produção real — a feature de cores
-- customizadas nunca chegou a ser migrada lá, o app já usa defaults em silêncio.
-- As ~15 tabelas restantes ficam fora desta fase — ver plano.)

-- ─── COMPANIES ──────────────────────────────────────────────────────────────

CREATE TABLE companies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  slug                     TEXT UNIQUE NOT NULL,
  contract_signer_name     TEXT,
  contract_signer_cpf      TEXT,
  contract_signer_email    TEXT,
  contract_signer_phone    TEXT,
  contract_signer_address  TEXT,
  is_platform_owner        BOOLEAN NOT NULL DEFAULT false,
  active                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- Sem policies públicas: só service-role (rota de super admin) mexe direto aqui.

CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PROFILES: company_id + super admin ────────────────────────────────────

ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Resolve a empresa do usuário logado. SECURITY DEFINER pra evitar recursão de RLS
-- (mesmo motivo que já existe public.is_admin() em supabase_completo.sql:96-104 —
-- uma policy em profiles que consulta profiles direto recursiona infinitamente).
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- handle_new_user() passa a propagar company_id/is_super_admin vindos do metadata
-- (mesmo mecanismo que já grava "role" hoje, só estendido).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, company_id, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager'),
    (NEW.raw_user_meta_data->>'company_id')::uuid,
    COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── company_id nas demais tabelas do escopo ───────────────────────────────

ALTER TABLE clients          ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE campaigns        ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE campaign_metrics ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE integrations     ADD COLUMN company_id UUID REFERENCES companies(id);

-- ─── Backfill: dados existentes viram a empresa "Digital Alpha" ────────────

DO $$
DECLARE
  digital_alpha_id UUID;
BEGIN
  INSERT INTO companies (name, slug, is_platform_owner, active)
  VALUES ('Digital Alpha', 'digital-alpha', true, true)
  RETURNING id INTO digital_alpha_id;

  UPDATE profiles SET company_id = digital_alpha_id WHERE company_id IS NULL;
  UPDATE clients SET company_id = digital_alpha_id WHERE company_id IS NULL;
  UPDATE campaigns SET company_id = digital_alpha_id WHERE company_id IS NULL;
  UPDATE campaign_metrics SET company_id = digital_alpha_id WHERE company_id IS NULL;
  UPDATE integrations SET company_id = digital_alpha_id WHERE company_id IS NULL;

  UPDATE profiles SET is_super_admin = true
    WHERE role = 'admin' AND company_id = digital_alpha_id;
END $$;

ALTER TABLE profiles         ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE clients          ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE campaigns        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE campaign_metrics ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE integrations     ALTER COLUMN company_id SET NOT NULL;

-- integrations: UNIQUE(type) -> UNIQUE(company_id, type)
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_type_key;
ALTER TABLE integrations ADD CONSTRAINT integrations_company_type_key UNIQUE (company_id, type);

-- ─── RLS: limpa TODAS as policies antigas das tabelas em escopo ────────────
-- (Várias migrations ao longo do tempo redefiniram policies nessas tabelas com
-- nomes diferentes — em vez de adivinhar quais estão realmente ativas hoje,
-- removemos todas dinamicamente antes de criar as novas company-scoped. Isso
-- evita o risco de uma policy antiga "global" continuar ativa em paralelo com
-- a nova e vazar dados entre empresas, já que policies RLS são permissivas
-- (combinadas com OR).)

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','clients','campaigns','campaign_metrics','integrations']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ─── profiles ───────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_same_company" ON profiles FOR SELECT
  USING (company_id = public.get_current_company_id() OR public.is_super_admin());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_super_admin_all" ON profiles FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ─── clients ────────────────────────────────────────────────────────────────

CREATE POLICY "clients_select_company" ON clients FOR SELECT
  USING (company_id = public.get_current_company_id());
CREATE POLICY "clients_insert_company" ON clients FOR INSERT
  WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "clients_update_company" ON clients FOR UPDATE
  USING (company_id = public.get_current_company_id());
CREATE POLICY "clients_delete_company_admin" ON clients FOR DELETE
  USING (company_id = public.get_current_company_id() AND public.is_admin());

-- ─── campaigns ──────────────────────────────────────────────────────────────

CREATE POLICY "campaigns_select_company" ON campaigns FOR SELECT
  USING (company_id = public.get_current_company_id());
CREATE POLICY "campaigns_insert_company" ON campaigns FOR INSERT
  WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "campaigns_update_company" ON campaigns FOR UPDATE
  USING (company_id = public.get_current_company_id());
CREATE POLICY "campaigns_delete_company_admin" ON campaigns FOR DELETE
  USING (company_id = public.get_current_company_id() AND public.is_admin());

-- ─── campaign_metrics ───────────────────────────────────────────────────────

CREATE POLICY "campaign_metrics_select_company" ON campaign_metrics FOR SELECT
  USING (company_id = public.get_current_company_id());
CREATE POLICY "campaign_metrics_insert_company" ON campaign_metrics FOR INSERT
  WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "campaign_metrics_update_company" ON campaign_metrics FOR UPDATE
  USING (company_id = public.get_current_company_id());
CREATE POLICY "campaign_metrics_delete_company" ON campaign_metrics FOR DELETE
  USING (company_id = public.get_current_company_id());

-- ─── integrations ───────────────────────────────────────────────────────────

CREATE POLICY "integrations_select_company" ON integrations FOR SELECT
  USING (company_id = public.get_current_company_id());
CREATE POLICY "integrations_update_company_admin" ON integrations FOR UPDATE
  USING (company_id = public.get_current_company_id() AND public.is_admin());
