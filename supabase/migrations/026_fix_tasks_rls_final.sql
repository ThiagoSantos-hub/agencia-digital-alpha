-- Remove políticas conflitantes ou incompletas
DROP POLICY IF EXISTS "Admin full access tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator sees own tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator updates own tasks status" ON tasks;
DROP POLICY IF EXISTS "Collaborator inserts own tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator deletes own tasks" ON tasks;

-- 1. ADMIN: Acesso total (Baseado na função is_admin() que consulta profiles)
CREATE POLICY "Admin full access tasks" ON tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. COLABORADOR: Ver tarefas atribuídas a ele
-- (Verifica tanto o link direto com collaborators quanto o assignee_id no profile)
CREATE POLICY "Collaborator sees assigned tasks" ON tasks
  FOR SELECT
  USING (
    collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
    OR 
    assignee_id = auth.uid()
  );

-- 3. COLABORADOR: Inserir tarefas (Permite se ele for o criador ou se estiver atribuindo a si mesmo)
CREATE POLICY "Collaborator inserts tasks" ON tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (
      collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
      OR 
      assignee_id = auth.uid()
      OR
      created_by = auth.uid()
    )
  );

-- 4. COLABORADOR: Atualizar tarefas atribuídas
CREATE POLICY "Collaborator updates assigned tasks" ON tasks
  FOR UPDATE
  USING (
    collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
    OR 
    assignee_id = auth.uid()
  )
  WITH CHECK (
    collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
    OR 
    assignee_id = auth.uid()
  );

-- 5. COLABORADOR: Deletar tarefas que ele mesmo criou
CREATE POLICY "Collaborator deletes own tasks" ON tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
  );
