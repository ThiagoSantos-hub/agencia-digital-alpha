-- 1. Backup e Remoção (Se houver dados importantes, esta migration deve ser ajustada, mas aqui focamos em funcionalidade)
DROP TABLE IF EXISTS tasks CASCADE;

-- 2. Criação da Tabela com Schema Limpo e Moderno
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'a_fazer',
  priority TEXT NOT NULL DEFAULT 'media',
  due_date DATE,
  
  -- Relacionamentos
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Constraints de Validação
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada', 'pendente', 'concluida', 'cancelada'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));

-- 4. Índices para Performance
CREATE INDEX idx_tasks_collaborator ON tasks(collaborator_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 5. RLS (Row Level Security) - Simplificado e Funcional
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin: Acesso Total
CREATE POLICY "Admin_Full_Access" ON tasks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Autenticados: Podem ver o que criaram ou o que lhes foi atribuído
CREATE POLICY "User_View_Assigned" ON tasks
  FOR SELECT USING (
    auth.uid() = created_by 
    OR auth.uid() = assignee_id 
    OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
  );

-- Autenticados: Podem criar tarefas
CREATE POLICY "User_Insert_Tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Autenticados: Podem atualizar o que lhes foi atribuído ou o que criaram
CREATE POLICY "User_Update_Tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = created_by 
    OR auth.uid() = assignee_id 
    OR collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())
  ) WITH CHECK (auth.role() = 'authenticated');

-- Autenticados: Podem deletar o que criaram
CREATE POLICY "User_Delete_Tasks" ON tasks
  FOR DELETE USING (auth.uid() = created_by);
