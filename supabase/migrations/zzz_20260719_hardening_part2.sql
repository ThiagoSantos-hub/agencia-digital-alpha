-- zzz_20260719_hardening_part2.sql
-- Continuação da faxina de segurança do dia: itens médios que ficaram de fora
-- da migration zzz_20260719_security_hardening.sql. Mesma convenção de nome
-- (roda depois de tudo, inclusive depois de 999_master_fix_tasks.sql).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. novidades — a policy de UPDATE segue liberada pra qualquer autenticado
--    (usada hoje só pra marcar como lida via lida_por), mas antes disso
--    qualquer um podia editar título/descrição de um aviso publicado por
--    outra pessoa. Trigger garante que só super_admin muda o conteúdo real;
--    qualquer outro usuário só consegue de fato alterar lida_por.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_novidades_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    NEW.titulo := OLD.titulo;
    NEW.descricao := OLD.descricao;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_novidades_content_trigger ON novidades;
CREATE TRIGGER protect_novidades_content_trigger
  BEFORE UPDATE ON novidades
  FOR EACH ROW EXECUTE FUNCTION public.protect_novidades_content();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. storage.objects — bucket "feedback-anexos" permitia LISTAGEM pública
--    (qualquer um, sem login, podia listar todos os arquivos do bucket via
--    API de storage). Acesso direto por URL já pública continua funcionando
--    normalmente (não depende dessa policy) — só a listagem via API fecha.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public_read_feedback_anexos" ON storage.objects;
CREATE POLICY "authenticated_read_feedback_anexos" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'feedback-anexos');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Endurece search_path de todas as funções SECURITY DEFINER apontadas
--    pelo Security Advisor do Supabase ("Function Search Path Mutable") —
--    evita risco teórico de search_path hijacking.
-- ────────────────────────────────────────────────────────────────────────────

ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.reset_recurring_checklists_by_day() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_finances_updated_at() SET search_path = public;
ALTER FUNCTION public.gerar_notificacoes_vencimento() SET search_path = public;
ALTER FUNCTION public.notify_new_feedback() SET search_path = public;
ALTER FUNCTION public.delete_old_ai_messages() SET search_path = public;
ALTER FUNCTION public.notify_task_assignment() SET search_path = public;
ALTER FUNCTION public.update_checklist_status() SET search_path = public;
ALTER FUNCTION public.reset_recurring_checklists() SET search_path = public;
ALTER FUNCTION public.auto_escalate_task_priority() SET search_path = public;
ALTER FUNCTION public.cleanup_old_feedbacks() SET search_path = public;
ALTER FUNCTION public.handle_task_notification() SET search_path = public;
ALTER FUNCTION public.cleanup_old_finished_tasks() SET search_path = public;
ALTER FUNCTION public.get_current_company_id() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Correção do REVOKE anterior (zzz_20260719_security_hardening.sql): estava
--    revogando EXECUTE de anon/authenticated especificamente, mas Postgres
--    concede EXECUTE a PUBLIC por padrão e todo role herda PUBLIC — revogar do
--    role específico sem revogar de PUBLIC não tem efeito nenhum (confirmado:
--    as 4 funções de manutenção continuavam chamáveis por anon depois do
--    "revoke" anterior). Revoga de PUBLIC pra valer, e também
--    protect_novidades_content (nova, criada no item 1 acima — é trigger, não
--    deveria ser chamável via RPC direto).
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.cleanup_old_feedbacks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_finished_tasks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_old_ai_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_recurring_checklists() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_novidades_content() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.auto_escalate_task_priority() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_escalate_task_priority() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO authenticated;
