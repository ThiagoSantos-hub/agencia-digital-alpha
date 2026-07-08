-- Função para criar notificações automáticas e gerenciar o retorno de tarefas resolvidas
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Notificar quando uma tarefa é ATRIBUÍDA a alguém novo
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    target_user_id := NEW.assigned_to;
    -- Não notificar se o criador for o mesmo que o atribuído
    IF NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (target_user_id, 'Nova tarefa atribuída', 'Você recebeu a tarefa: ' || NEW.title, 'task', '/tarefas');
    END IF;
  END IF;

  -- 2. Fluxo de Retorno de Pendência: Quando o status muda de 'pendente' para 'a_fazer'
  -- A tarefa deve ser reatribuída ao criador original para ele continuar o trabalho
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'a_fazer') THEN
    -- Reatribuir ao criador
    NEW.assigned_to := NEW.created_by;
    
    -- Notificar o criador que a pendência foi resolvida e a tarefa voltou para ele
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.created_by, 'Pendência resolvida!', 'A tarefa "' || NEW.title || '" foi resolvida e voltou para o seu quadro.', 'task', '/colaborador/tarefas');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a função
DROP TRIGGER IF EXISTS on_task_change_notification ON public.tasks;
CREATE TRIGGER on_task_change_notification
  BEFORE INSERT OR UPDATE ON public.tasks -- Mudado para BEFORE para permitir alteração de NEW.assigned_to
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_notification();
