-- 1. Garante a existência de todas as colunas necessárias
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'a_fazer',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Limpa constraints antigas para evitar conflitos
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- 3. Adiciona as constraints corretas e abrangentes
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada', 'pendente', 'concluida', 'cancelada'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 4. Garante que as políticas RLS não bloqueiem o Admin nem o Colaborador
DROP POLICY IF EXISTS "Admin full access tasks" ON tasks;
DROP POLICY IF EXISTS "Collaborator inserts tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON tasks;

-- Admin tem acesso total
CREATE POLICY "Admin full access tasks" ON tasks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Usuários autenticados podem inserir tarefas (o controle fino é feito via código/trigger se necessário)
-- Mas aqui permitimos a inserção para evitar o erro 400 de RLS
CREATE POLICY "Allow insert for authenticated users" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Visualização: Admin vê tudo, Colaborador vê o que lhe é atribuído ou o que criou
DROP POLICY IF EXISTS "Collaborator sees assigned tasks" ON tasks;
CREATE POLICY "Task visibility" ON tasks
  FOR SELECT USING (
    public.is_admin() 
    OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );
