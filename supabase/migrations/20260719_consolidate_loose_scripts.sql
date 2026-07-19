-- 20260719_consolidate_loose_scripts.sql
-- Consolida o conteúdo NÃO coberto pelas migrations de RLS de
-- supabase/fix_tasks_privacy.sql, fix_tasks_system.sql,
-- fix_checklists_privacy.sql, fix_checklists_rpc.sql e enable_realtime.sql
-- (arquivos soltos fora de supabase/migrations/, removidos do repositório
-- depois desta migration). As policies de RLS desses arquivos já foram
-- recriadas do zero em zzz_20260719_security_hardening.sql — o que falta
-- capturar aqui é só o que NÃO é policy: GRANTs de tabela, a função de reset
-- de checklists recorrentes, e a inscrição das tabelas no realtime.

-- ─── Função de reset de checklists recorrentes (de fix_checklists_rpc.sql) ──
-- Sem esta migration, um rebuild do zero a partir de supabase/migrations/
-- nunca criaria essa função — só as migrations posteriores (zzz_*) que
-- endurecem seu search_path, presumindo que ela já existe.

CREATE OR REPLACE FUNCTION public.reset_recurring_checklists_by_day()
RETURNS void AS $$
DECLARE
  current_day INT;
BEGIN
  current_day := EXTRACT(DOW FROM NOW())::INT;

  UPDATE public.checklist_items
  SET completed = false
  WHERE checklist_id IN (
    SELECT id FROM public.checklists
    WHERE current_day = ANY(recurrence_days)
    AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL)
  );

  UPDATE public.checklists
  SET
    status = 'pending',
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE current_day = ANY(recurrence_days)
  AND (last_reset_at::DATE < NOW()::DATE OR last_reset_at IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- (search_path fixado direto aqui: CREATE OR REPLACE não herda o SET aplicado
-- via ALTER FUNCTION por uma migration posterior — descoberto ao aplicar esta
-- migration em produção, que silenciosamente zerou o search_path que
-- zzz_20260719_hardening_part2.sql já tinha corrigido.)

GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_recurring_checklists_by_day() TO service_role;

-- ─── GRANTs de tabela (de fix_tasks_system.sql / fix_checklists_privacy.sql) ─
-- RLS restringe LINHAS, mas ainda precisa do GRANT de tabela pra sequer
-- tentar a operação — sem isso, um rebuild do zero bloquearia authenticated
-- de fazer qualquer coisa em tasks/checklists/checklist_items, mesmo com RLS
-- correta.

GRANT ALL ON TABLE tasks TO postgres, service_role, authenticated;
GRANT ALL ON TABLE checklists TO postgres, service_role, authenticated;
GRANT ALL ON TABLE checklist_items TO postgres, service_role, authenticated;

-- ─── Realtime (de enable_realtime.sql) ──────────────────────────────────────
-- Sem isso, as subscriptions .channel().on('postgres_changes', ...) usadas em
-- useNotificacoes/useTasks nunca recebem eventos — a tabela precisa estar na
-- publicação supabase_realtime. Idempotente: só adiciona se ainda não estiver.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
END $$;
