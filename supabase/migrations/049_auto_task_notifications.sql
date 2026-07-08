-- Função para criar notificações automáticas baseadas em mudanças nas tarefas
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
DECLARE
  target_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT := 'task';
BEGIN
  -- 1. Notificar quando uma tarefa é ATRIBUÍDA a alguém novo
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    target_user_id := NEW.assigned_to;
    -- Não notificar se o criador for o mesmo que o atribuído
    IF NEW.created_by != NEW.assigned_to THEN
      notification_title := 'Nova tarefa atribuída';
      notification_message := 'Você recebeu a tarefa: ' || NEW.title;
      
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (target_user_id, notification_title, notification_message, notification_type, '/tarefas');
    END IF;
  END IF;

  -- 2. Notificar o CRIADOR quando uma pendência é resolvida (movida de 'pendente' para 'a_fazer')
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'a_fazer') THEN
    target_user_id := NEW.created_by;
    -- Só notifica se o criador não for quem moveu (geralmente o admin move)
    notification_title := 'Pendência resolvida!';
    notification_message := 'A tarefa "' || NEW.title || '" foi movida para A Fazer.';
    
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (target_user_id, notification_title, notification_message, notification_type, '/colaborador/tarefas');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a função
DROP TRIGGER IF EXISTS on_task_change_notification ON public.tasks;
CREATE TRIGGER on_task_change_notification
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_notification();
