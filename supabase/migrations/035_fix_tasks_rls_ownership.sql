-- ==========================================
-- CORREÇÃO DE PROPRIEDADE E RLS PARA TAREFAS
-- ==========================================

-- 1. Garante que a coluna owner_id exista e tenha o default correto
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- 2. Atualiza tarefas órfãs (caso existam) para pertencerem ao primeiro admin encontrado ou ao criador
UPDATE tasks SET owner_id = auth.uid() WHERE owner_id IS NULL;

-- 3. Simplifica a política de SELECT para garantir que o usuário veja o que ele cria
DROP POLICY IF EXISTS "tasks_select_auth" ON tasks;
CREATE POLICY "tasks_select_auth" ON tasks FOR SELECT USING (
  auth.uid() = owner_id OR 
  public.is_admin() OR
  collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
);

-- 4. Garante que o INSERT defina o owner_id automaticamente se não fornecido
DROP POLICY IF EXISTS "tasks_insert_auth" ON tasks;
CREATE POLICY "tasks_insert_auth" ON tasks FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- 5. Trigger para garantir que owner_id seja sempre o usuário atual no insert
CREATE OR REPLACE FUNCTION public.handle_task_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_task_owner ON tasks;
CREATE TRIGGER tr_task_owner
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_owner();

-- Força o reload do PostgREST
NOTIFY pgrst, 'reload schema';
