-- Migration 061: Ajuste na Limpeza Automática de Feedbacks
-- Objetivo: Garantir que apenas feedbacks com status 'resolvido' sejam excluídos após 30 dias.
-- Feedbacks 'pendentes' ou 'em_analise' serão mantidos independentemente da idade.

CREATE OR REPLACE FUNCTION public.cleanup_old_feedbacks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.feedbacks
  WHERE status = 'resolvido'
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
