-- ==========================================
-- CORREÇÃO DEFINITIVA DA TABELA TASKS
-- ==========================================

-- 1. Garante a estrutura correta da tabela
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL;

-- 2. Limpa constraints antigas que podem causar Erro 400
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada', 'pendente', 'concluida', 'cancelada'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 3. Reset total de RLS para evitar bloqueios silenciosos
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin_Full_Access" ON tasks;
DROP POLICY IF EXISTS "User_Insert_Tasks" ON tasks;
DROP POLICY IF EXISTS "User_View_Assigned" ON tasks;
DROP POLICY IF EXISTS "User_Update_Tasks" ON tasks;
DROP POLICY IF EXISTS "User_Delete_Tasks" ON tasks;
DROP POLICY IF EXISTS "Admin full access tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator sees own tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator updates own tasks status" ON tasks;

-- 4. Reabilita RLS com políticas ultra-permissivas para teste
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin: Tudo
CREATE POLICY "tasks_admin_all" ON tasks FOR ALL USING (public.is_admin());

-- Qualquer autenticado pode inserir
CREATE POLICY "tasks_insert_auth" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Qualquer autenticado pode ver, editar e deletar o que criou ou o que lhe foi atribuído
CREATE POLICY "tasks_select_auth" ON tasks FOR SELECT USING (
  auth.uid() = created_by OR 
  auth.uid() = owner_id OR 
  auth.uid() = assignee_id OR
  collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);

CREATE POLICY "tasks_update_auth" ON tasks FOR UPDATE USING (
  auth.uid() = created_by OR 
  auth.uid() = owner_id OR 
  auth.uid() = assignee_id OR
  collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);

CREATE POLICY "tasks_delete_auth" ON tasks FOR DELETE USING (
  auth.uid() = created_by OR 
  auth.uid() = owner_id
);

-- 5. Força o reload do PostgREST para limpar o cache do schema
NOTIFY pgrst, 'reload schema';
