-- Migration 040: Novo Sistema de Tarefas do Zero
-- Foco em privacidade e controle por colaborador

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baixa', 'media', 'alta')),
  
  -- Quem criou a tarefa (pode ser admin ou o próprio colaborador)
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Quem deve executar a tarefa
  assigned_to   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Datas
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 1. ADMINS: Podem ver, criar, editar e excluir QUALQUER tarefa
CREATE POLICY "admins_full_access_tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 2. COLABORADORES: Podem ver tarefas atribuídas a eles OU criadas por eles
CREATE POLICY "collaborators_view_own_tasks"
  ON tasks FOR SELECT
  USING (
    auth.uid() = assigned_to OR auth.uid() = created_by
  );

-- 3. COLABORADORES: Podem criar suas próprias tarefas
CREATE POLICY "collaborators_insert_own_tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- 4. COLABORADORES: Podem editar suas próprias tarefas ou as que foram atribuídas a eles (para mudar status)
CREATE POLICY "collaborators_update_own_tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to OR auth.uid() = created_by
  )
  WITH CHECK (
    auth.uid() = assigned_to OR auth.uid() = created_by
  );

-- 5. COLABORADORES: Podem excluir apenas as tarefas que eles mesmos criaram
CREATE POLICY "collaborators_delete_own_tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() = created_by
  );
