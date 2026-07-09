-- Migration 059: Notificações Automáticas de Feedback para Admins
-- Objetivo: Notificar todos os administradores quando um novo feedback (sugestão ou bug) for enviado.

CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Loop por todos os perfis que são administradores
  FOR admin_record IN 
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      admin_record.id,
      CASE 
        WHEN NEW.tipo = 'bug' THEN '🚨 Novo Bug Reportado'
        ELSE '💡 Nova Sugestão Recebida'
      END,
      'O colaborador enviou um novo feedback: ' || NEW.titulo,
      'geral'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger na tabela feedbacks
DROP TRIGGER IF EXISTS on_new_feedback ON feedbacks;
CREATE TRIGGER on_new_feedback
  AFTER INSERT ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_feedback();
