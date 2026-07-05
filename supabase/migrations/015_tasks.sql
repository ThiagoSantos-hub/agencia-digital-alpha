-- Migration 015: Tabela de tarefas com Kanban

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'a_fazer'
    CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada')),
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS tasks_collaborator_id_idx ON tasks(collaborator_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Admin vê e gerencia todas as tarefas
CREATE POLICY "Admin full access tasks"
  ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Colaborador vê apenas as próprias tarefas
CREATE POLICY "Collaborator sees own tasks"
  ON tasks
  FOR SELECT
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );

-- Colaborador pode atualizar status das próprias tarefas
CREATE POLICY "Collaborator updates own tasks status"
  ON tasks
  FOR UPDATE
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );
