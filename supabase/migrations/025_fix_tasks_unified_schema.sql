-- Garante que a tabela tasks tenha TODOS os campos necessários
-- para useTasks (Kanban) e useTarefas (lista completa)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Atualiza o constraint de status para aceitar todos os valores usados pelos hooks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada', 'pendente', 'concluida', 'cancelada'));
