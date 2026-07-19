-- zzz_20260719_security_hardening.sql
-- Corrige o achado central da auditoria de 2026-07-19: a fundação multi-tenant
-- (20260719_multi_tenant_foundation.sql) só isolou por empresa 5 tabelas
-- (profiles, clients, campaigns, campaign_metrics, integrations). As tabelas
-- abaixo ficaram com RLS "role='admin' global" de antes do multi-tenant, o que
-- hoje é vazamento real: já existe uma segunda empresa (Agencia Teste,
-- 0786bf9a-6114-475d-b1a1-df8944ad0dc8) além da Digital Alpha (plataforma,
-- 6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0) usando o mesmo banco.
--
-- Nome do arquivo começa com "zzz" de propósito: convenção deste repositório
-- (visto em 999_master_fix_tasks.sql) é nomear migrations que precisam rodar
-- por último com um prefixo que ordena depois de tudo — dígitos (0-9) sempre
-- ordenam antes de letras em comparação lexicográfica, então "zzz_..." roda
-- depois mesmo de "999_...", inclusive numa reaplicação do zero.

-- ────────────────────────────────────────────────────────────────────────────
-- 0. profiles — remove em definitivo a policy fantasma de 999_master_fix_tasks.sql
--    (não está ativa em produção hoje, mas o arquivo antigo continua recriando
--    ela; isso garante que uma reaplicação do zero nunca mais reabra o vazamento)
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. finances — adiciona company_id e troca RLS "role=admin global" por
--    company-scoped (mantém o acesso pessoal por user_id/escopo intacto)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE finances ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

UPDATE finances f
SET company_id = COALESCE(
  (SELECT p.company_id FROM profiles p WHERE p.id = f.user_id),
  '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0'
)
WHERE f.company_id IS NULL;

ALTER TABLE finances ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='finances'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.finances', pol.policyname); END LOOP;
END $$;

CREATE POLICY "finances_select_company_admin" ON finances FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "finances_select_own_personal" ON finances FOR SELECT
  USING (user_id = auth.uid() AND escopo = 'pessoal');
CREATE POLICY "finances_insert_company_admin" ON finances FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "finances_insert_own_personal" ON finances FOR INSERT
  WITH CHECK (user_id = auth.uid() AND escopo = 'pessoal');
CREATE POLICY "finances_update_company_admin" ON finances FOR UPDATE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "finances_update_own_personal" ON finances FOR UPDATE
  USING (user_id = auth.uid() AND escopo = 'pessoal');
CREATE POLICY "finances_delete_company_admin" ON finances FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "finances_delete_own_personal" ON finances FOR DELETE
  USING (user_id = auth.uid() AND escopo = 'pessoal');

-- ────────────────────────────────────────────────────────────────────────────
-- 2. webhooks — adiciona company_id (era slot global, agora slot POR empresa)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE webhooks SET company_id = '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0' WHERE company_id IS NULL;
ALTER TABLE webhooks ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS webhooks_slot_key;
ALTER TABLE webhooks ADD CONSTRAINT webhooks_company_slot_key UNIQUE (company_id, slot);

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='webhooks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.webhooks', pol.policyname); END LOOP;
END $$;

CREATE POLICY "webhooks_all_company_admin" ON webhooks FOR ALL
  USING (company_id = get_current_company_id() AND is_admin())
  WITH CHECK (company_id = get_current_company_id() AND is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 3. collaborators, reports, alerts, feedbacks, conversations — mesmo padrão:
--    adiciona company_id, faz backfill via profiles, recria RLS company-scoped
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE collaborators c
SET company_id = COALESCE((SELECT p.company_id FROM profiles p WHERE p.id = c.user_id), '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0')
WHERE c.company_id IS NULL;
ALTER TABLE collaborators ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='collaborators'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.collaborators', pol.policyname); END LOOP;
END $$;

CREATE POLICY "collaborators_select_company_admin" ON collaborators FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "collaborators_select_own" ON collaborators FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "collaborators_insert_company_admin" ON collaborators FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "collaborators_update_company_admin" ON collaborators FOR UPDATE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "collaborators_delete_company_admin" ON collaborators FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());

ALTER TABLE reports ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE reports r
SET company_id = COALESCE((SELECT p.company_id FROM profiles p WHERE p.id = r.user_id), '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0')
WHERE r.company_id IS NULL;
ALTER TABLE reports ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='reports'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname); END LOOP;
END $$;

CREATE POLICY "reports_select_company_admin" ON reports FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "reports_select_own" ON reports FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "reports_insert_company_admin" ON reports FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reports_update_company_admin" ON reports FOR UPDATE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "reports_update_own" ON reports FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "reports_delete_company_admin" ON reports FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "reports_delete_own" ON reports FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE alerts a
SET company_id = COALESCE((SELECT p.company_id FROM profiles p WHERE p.id = a.user_id), '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0')
WHERE a.company_id IS NULL;
ALTER TABLE alerts ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='alerts'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.alerts', pol.policyname); END LOOP;
END $$;

CREATE POLICY "alerts_select_company_admin" ON alerts FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "alerts_insert_company_admin" ON alerts FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "alerts_update_company_admin" ON alerts FOR UPDATE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "alerts_delete_company_admin" ON alerts FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE feedbacks f
SET company_id = COALESCE((SELECT p.company_id FROM profiles p WHERE p.id = f.colaborador_id), '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0')
WHERE f.company_id IS NULL;
ALTER TABLE feedbacks ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='feedbacks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.feedbacks', pol.policyname); END LOOP;
END $$;

CREATE POLICY "feedbacks_select_company_admin" ON feedbacks FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "feedbacks_select_own" ON feedbacks FOR SELECT
  USING (colaborador_id = auth.uid());
CREATE POLICY "feedbacks_insert_own" ON feedbacks FOR INSERT
  WITH CHECK (colaborador_id = auth.uid());
CREATE POLICY "feedbacks_update_company_admin" ON feedbacks FOR UPDATE
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "feedbacks_delete_company_admin" ON feedbacks FOR DELETE
  USING (company_id = get_current_company_id() AND is_admin());

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
UPDATE conversations c
SET company_id = COALESCE((SELECT p.company_id FROM profiles p WHERE p.id = c.user_id), '6e3ec6c8-5076-4fdc-9a2e-ead1361e81e0')
WHERE c.company_id IS NULL;
ALTER TABLE conversations ALTER COLUMN company_id SET NOT NULL;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='conversations'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname); END LOOP;
END $$;

CREATE POLICY "conversations_select_company_admin" ON conversations FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. novidades — permanece GLOBAL de propósito (mural de avisos da plataforma
--    pra todas as empresas, não é dado de uma empresa específica). O problema
--    real não é falta de company_id, é que qualquer admin (de qualquer empresa)
--    podia criar/apagar aviso global — restringe a apenas super admin da
--    plataforma. UPDATE (usado hoje pra marcar como lida) segue liberado pra
--    qualquer autenticado — risco residual aceito por ora (só afeta o texto de
--    um aviso público, não dado sensível); ver relatório de auditoria.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Apenas admins podem excluir novidades" ON novidades;
DROP POLICY IF EXISTS "Apenas admins podem inserir novidades" ON novidades;

CREATE POLICY "novidades_insert_super_admin" ON novidades FOR INSERT
  WITH CHECK (is_super_admin());
CREATE POLICY "novidades_delete_super_admin" ON novidades FOR DELETE
  USING (is_super_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 5. elevenlabs_transcripts — estava 100% pública (USING true / WITH CHECK
--    true, sem exigir nem "authenticated"). Trava totalmente: só service-role
--    acessa (mesmo padrão já usado em "contracts" neste mesmo banco).
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Acesso publico elevenlabs_transcripts" ON elevenlabs_transcripts;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. whatsapp_instances / whatsapp_groups — o compartilhamento "colaborador vê
--    grupos do próprio admin" nunca checava a EMPRESA de quem pedia, só se o
--    dono da linha era admin (instance) ou tinha o flag ligado (groups).
--    Corrige exigindo que solicitante e dono estejam na mesma empresa.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Collaborators can view admin instance" ON whatsapp_instances;
CREATE POLICY "whatsapp_instances_select_same_company_admin" ON whatsapp_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles owner_p, profiles requester_p
      WHERE owner_p.id = whatsapp_instances.user_id
        AND requester_p.id = auth.uid()
        AND owner_p.role = 'admin'
        AND owner_p.company_id = requester_p.company_id
    )
  );

DROP POLICY IF EXISTS "Collaborators can view admin groups if allowed" ON whatsapp_groups;
CREATE POLICY "whatsapp_groups_select_same_company_admin" ON whatsapp_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_instances wi, profiles owner_p, profiles requester_p
      WHERE wi.user_id = whatsapp_groups.user_id
        AND wi.grupos_visiveis_colaboradores = true
        AND owner_p.id = whatsapp_groups.user_id
        AND requester_p.id = auth.uid()
        AND owner_p.company_id = requester_p.company_id
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 7. tasks — NÃO restringe a visibilidade do admin (confirmado com o usuário
--    em sessão anterior: admin ver todas as tarefas dos colaboradores é
--    comportamento intencional, não o bug). O que corrige de fato:
--    a) WITH CHECK(true) no UPDATE permitia reatribuir qualquer campo, sem
--       repetir a mesma condição do USING;
--    b) limpa ~9 policies redundantes/conflitantes acumuladas por várias
--       migrations (fix_tasks_system.sql, fix_tasks_privacy.sql, 048, 051,
--       052, 999_master_fix_tasks.sql) em 4 policies canônicas, uma por
--       operação, preservando exatamente o comportamento já confirmado.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname); END LOOP;
END $$;

CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (is_admin() OR auth.uid() = created_by OR auth.uid() = assigned_to);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (is_admin() OR auth.uid() = created_by OR auth.uid() = assigned_to)
  WITH CHECK (is_admin() OR auth.uid() = created_by OR auth.uid() = assigned_to);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (is_admin() OR auth.uid() = created_by);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. checklists / checklist_items — limpa policies redundantes de owner
--    (012_checklists.sql, fix_checklists_privacy.sql, 055/056) em um único
--    conjunto canônico por operação. Mesmo comportamento (só o dono vê/edita),
--    sem mudança funcional — só remove o acúmulo de policies "fantasma".
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='checklists'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.checklists', pol.policyname); END LOOP;
END $$;

CREATE POLICY "checklists_select" ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklists_insert" ON checklists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklists_update" ON checklists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklists_delete" ON checklists FOR DELETE USING (auth.uid() = user_id);

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='checklist_items'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.checklist_items', pol.policyname); END LOOP;
END $$;

CREATE POLICY "checklist_items_select" ON checklist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checklist_items_insert" ON checklist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checklist_items_update" ON checklist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM checklists WHERE checklists.id = checklist_items.checklist_id AND checklists.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM checklists WHERE checklists.id = checklist_items.checklist_id AND checklists.user_id = auth.uid()));
CREATE POLICY "checklist_items_delete" ON checklist_items FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Funções de manutenção não deveriam ser chamáveis por anon/authenticated
--    via /rest/v1/rpc/... (Security Advisor: "Public Can Execute SECURITY
--    DEFINER Function"). Revoga execução direta — continuam funcionando
--    normalmente via triggers e pg_cron, que não passam pelo PostgREST.
-- ────────────────────────────────────────────────────────────────────────────

-- Estas 4 não são chamadas por nenhum código do frontend (confirmado via grep
-- por .rpc(...) em todo o repo) — só fazem sentido via pg_cron/manutenção, que
-- não depende de EXECUTE de anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_feedbacks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_finished_tasks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_old_ai_messages() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_recurring_checklists() FROM anon, authenticated;

-- Estas 2 SÃO chamadas direto pelo app (hooks/useTasks.ts e
-- hooks/useChecklists.ts via supabase.rpc(...) com sessão do usuário) — revoga
-- só de anon (usuário nunca logado), mantém authenticated pra não quebrar o app.
REVOKE EXECUTE ON FUNCTION public.auto_escalate_task_priority() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() FROM anon;
