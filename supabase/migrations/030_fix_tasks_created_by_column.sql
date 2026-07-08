-- 1. Garante que a coluna created_by existe e tem o tipo correto
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Notifica o PostgREST para recarregar o cache do schema (Isso é feito automaticamente pelo Supabase, mas a migration garante a estrutura)
NOTIFY pgrst, 'reload schema';

-- 3. Garante que a RLS permita o uso da coluna
DROP POLICY IF EXISTS "User_Insert_Tasks" ON tasks;
CREATE POLICY "User_Insert_Tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
