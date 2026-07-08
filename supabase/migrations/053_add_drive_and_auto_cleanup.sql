-- 1. Adicionar campo opcional para link do Google Drive
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS drive_link TEXT;

-- 2. Função para limpeza automática de tarefas finalizadas há mais de 30 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_finished_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.tasks
  WHERE status = 'finalizada'
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Para automação total, o usuário deve configurar um Cron Job no painel do Supabase 
-- ou usar o pg_cron se disponível: SELECT cron.schedule('0 0 * * *', 'SELECT cleanup_old_finished_tasks()');
