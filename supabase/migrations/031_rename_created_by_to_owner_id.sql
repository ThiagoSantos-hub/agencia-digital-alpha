-- 1. Renomeia a coluna para forçar o PostgREST a atualizar o cache
ALTER TABLE tasks RENAME COLUMN created_by TO owner_id;

-- 2. Se a coluna não existia por algum motivo de cache, cria ela agora com o novo nome
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Atualiza as políticas de RLS para usar o novo nome
DROP POLICY IF EXISTS "User_View_Assigned" ON tasks;
CREATE POLICY "User_View_Assigned" ON tasks
  FOR SELECT USING (
    auth.uid() = owner_id 
    OR auth.uid() = assignee_id 
    OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "User_Update_Tasks" ON tasks;
CREATE POLICY "User_Update_Tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = owner_id 
    OR auth.uid() = assignee_id 
    OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
  ) WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "User_Delete_Tasks" ON tasks;
CREATE POLICY "User_Delete_Tasks" ON tasks
  FOR DELETE USING (auth.uid() = owner_id);

-- 4. Força o reload do schema
NOTIFY pgrst, 'reload schema';
