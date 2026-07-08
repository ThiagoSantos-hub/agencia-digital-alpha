-- 1. LIBERAR EXCLUSÃO: Colaboradores apagam as suas, Admin apaga todas
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks" ON public.tasks
  FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
  );

-- 2. DESTRAVAR MOVIMENTAÇÃO: Permitir que o Admin e o Atribuído atualizem a tarefa
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;

CREATE POLICY "Users can update tasks" ON public.tasks
  FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() = created_by)
    OR (auth.uid() = assigned_to)
  )
  WITH CHECK (true);

-- 3. AJUSTE NA DEVOLUÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger AS $$
BEGIN
  -- Se moveu de 'pendente' para qualquer outro status, devolve para o criador
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status != 'pendente') THEN
    NEW.assigned_to := NEW.created_by;
    
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (
      NEW.created_by, 
      'Pendência resolvida!', 
      'A tarefa "' || NEW.title || '" foi liberada e voltou para você.', 
      'geral'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
