-- Atualizar a política de visualização para que o administrador possa ver TODAS as pendências
-- Independentemente de quem criou ou a quem está atribuída.

DROP POLICY IF EXISTS "Users can view their own tasks or tasks assigned to them" ON public.tasks;

CREATE POLICY "Users can view relevant tasks" ON public.tasks
  FOR SELECT
  USING (
    -- O usuário pode ver se ele criou a tarefa
    auth.uid() = created_by 
    OR 
    -- O usuário pode ver se a tarefa foi atribuída a ele
    auth.uid() = assigned_to
    OR 
    -- O administrador pode ver se o status for 'pendente'
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    OR
    -- O administrador pode ver tarefas atribuídas a qualquer um
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Nota: Como o administrador já deve ter permissão total, vamos simplificar
-- Garantindo que o administrador veja TUDO na tabela tasks.

DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;

CREATE POLICY "Admins can view everything, others only their own" ON public.tasks
  FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR 
    (auth.uid() = created_by)
    OR 
    (auth.uid() = assigned_to)
  );
