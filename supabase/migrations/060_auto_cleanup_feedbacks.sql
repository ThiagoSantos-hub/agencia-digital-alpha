-- Migration 060: Limpeza Automática de Feedbacks (30 dias)
-- Objetivo: Excluir feedbacks com mais de 30 dias de criação automaticamente.

-- 1. Habilitar a extensão pg_cron se ainda não estiver habilitada (necessário ser superuser ou ter permissão no Supabase)
-- Nota: No Supabase, pg_cron geralmente já está disponível no schema 'extensions'.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar uma função que executa a limpeza
CREATE OR REPLACE FUNCTION public.cleanup_old_feedbacks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.feedbacks
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Agendar a tarefa para rodar todos os dias à meia-noite (00:00)
-- O comando 'cron.schedule' agenda a execução da função.
SELECT cron.schedule(
  'cleanup-feedbacks-30days', -- nome da tarefa
  '0 0 * * *',                -- cron: todo dia às 00:00
  'SELECT public.cleanup_old_feedbacks();'
);
