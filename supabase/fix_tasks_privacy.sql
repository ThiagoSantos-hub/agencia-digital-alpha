-- ====================================================================
-- SCRIPT DE PRIVACIDADE TOTAL PARA COLABORADORES
-- Garante que tarefas criadas por colaboradores para si mesmos sejam INVISÍVEIS para o Admin
-- ====================================================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "admin_full_access" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- 2. POLÍTICA PARA ADMINS
-- Admin vê apenas tarefas que ele criou OU que ele atribuiu a alguém
-- Admin NÃO vê tarefas criadas por colaboradores para si mesmos
CREATE POLICY "admin_view_restricted" ON tasks FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid()) -- Admin só vê o que ele mesmo criou (atribuído a ele ou a outros)
);

CREATE POLICY "admin_all_actions_own" ON tasks FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) 
  AND (created_by = auth.uid())
);

-- 3. POLÍTICA PARA COLABORADORES
-- Colaborador vê o que criou para si OU o que o Admin atribuiu a ele
CREATE POLICY "collab_view_tasks" ON tasks FOR SELECT TO authenticated 
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- Colaborador pode criar suas próprias tarefas
CREATE POLICY "collab_insert_tasks" ON tasks FOR INSERT TO authenticated 
WITH CHECK (
  auth.uid() = created_by
);

-- Colaborador pode atualizar suas tarefas ou as atribuídas a ele
CREATE POLICY "collab_update_tasks" ON tasks FOR UPDATE TO authenticated 
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- Colaborador pode excluir apenas o que criou
CREATE POLICY "collab_delete_tasks" ON tasks FOR DELETE TO authenticated 
USING (
  auth.uid() = created_by
);

-- 4. Garantir permissões
GRANT ALL ON TABLE tasks TO postgres, service_role, authenticated;
