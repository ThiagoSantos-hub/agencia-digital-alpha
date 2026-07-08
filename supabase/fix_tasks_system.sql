-- ====================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DO SISTEMA DE TAREFAS
-- Aplique este script no SQL Editor do seu painel Supabase
-- ====================================================================

-- 1. Limpeza de Segurança (Remover políticas antigas que podem estar conflitando)
DROP POLICY IF EXISTS "admins_full_access_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_view_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_insert_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_update_own_tasks" ON tasks;
DROP POLICY IF EXISTS "collaborators_delete_own_tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- 2. Garantir que a tabela tenha a estrutura correta
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'a_fazer'
                CHECK (status IN ('a_fazer', 'em_andamento', 'finalizada')),
  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baixa', 'media', 'alta')),
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 4. NOVAS POLÍTICAS SIMPLIFICADAS E ROBUSTAS

-- A) ADMINS: Controle total
CREATE POLICY "admin_all_tasks"
ON tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- B) COLABORADORES: Ver apenas o que lhes pertence ou o que criaram
CREATE POLICY "collab_select_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- C) COLABORADORES: Criar tarefas (o created_by deve ser o próprio usuário)
CREATE POLICY "collab_insert_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- D) COLABORADORES: Atualizar tarefas (apenas as suas ou atribuídas)
CREATE POLICY "collab_update_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  auth.uid() = assigned_to OR auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = assigned_to OR auth.uid() = created_by
);

-- E) COLABORADORES: Excluir apenas o que criaram
CREATE POLICY "collab_delete_tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
);

-- 5. Garantir permissões de acesso ao esquema public
GRANT ALL ON TABLE tasks TO postgres, service_role, authenticated;

-- MENSAGEM DE SUCESSO: Sistema de tarefas resetado e políticas aplicadas!
