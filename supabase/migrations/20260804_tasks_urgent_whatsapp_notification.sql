-- Quando uma tarefa entra na etiqueta "urgente", manda mais um aviso pelo
-- mesmo grupo/número já escolhido pra ela em "Avisar por WhatsApp" (opcional)
-- na criação. Reaproveita o whatsapp_destino/whatsapp_fonte gravados na
-- própria tarefa, e resolve a instância a partir de quem criou a tarefa
-- (created_by), mesmo contexto usado quando o aviso original foi mandado.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS whatsapp_destino TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS whatsapp_fonte TEXT CHECK (whatsapp_fonte IN ('own', 'agency'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgente_notificado_at TIMESTAMPTZ;

-- O segredo 'task_urgent_cron_secret' é inserido no Vault à parte, via SQL
-- direto (não commitado aqui), mesmo padrão de reports_cron_secret em
-- 20260731_reports_send_auth.sql; esta migration só ensina o trigger a
-- ler o segredo do vault e mandar no header.
CREATE OR REPLACE FUNCTION public.notify_task_urgent_webhook()
RETURNS TRIGGER AS $$
DECLARE
  cron_secret TEXT;
BEGIN
  IF NEW.priority = 'urgente'
     AND NEW.status != 'finalizada'
     AND NEW.whatsapp_destino IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.priority IS DISTINCT FROM NEW.priority) THEN

    SELECT decrypted_secret INTO cron_secret FROM vault.decrypted_secrets WHERE name = 'task_urgent_cron_secret';
    IF cron_secret IS NULL THEN
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://sistema.digitalalpha.store/api/tasks/notify-urgente',
      body := json_build_object('task_id', NEW.id)::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS on_task_urgent ON tasks;
CREATE TRIGGER on_task_urgent
  AFTER INSERT OR UPDATE OF priority ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_urgent_webhook();
