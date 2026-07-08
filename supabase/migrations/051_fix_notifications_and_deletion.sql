-- 1. Corrigir a Função de Notificação (Removendo o campo 'title' que não existe na tabela notifications)
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
BEGIN
  -- Notificar quando uma tarefa é ATRIBUÍDA a alguém novo
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    IF NEW.created_by != NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, message, type, link)
      VALUES (NEW.assigned_to, 'Nova tarefa: ' || NEW.title, 'task', '/tarefas');
    END IF;
  END IF;

  -- Retorno Automático: Quando move de 'pendente' para 'a_fazer'
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status = 'a_fazer') THEN
    NEW.assigned_to := NEW.created_by;
    INSERT INTO public.notifications (user_id, message, type, link)
    VALUES (NEW.created_by, 'Pendência resolvida: ' || NEW.title, 'task', '/colaborador/tarefas');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Liberar Permissão de Exclusão para Administradores
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
CREATE POLICY "Admins can delete any task" ON public.tasks
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
