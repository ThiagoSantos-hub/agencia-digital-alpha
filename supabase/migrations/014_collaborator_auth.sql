-- Migration 014: Suporte a autenticação de colaboradores

-- Adicionar coluna user_id na tabela collaborators (vincula ao Supabase Auth)
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para busca por user_id
CREATE INDEX IF NOT EXISTS collaborators_user_id_idx ON collaborators(user_id);

-- RLS: colaborador pode ler o próprio registro
CREATE POLICY "Collaborator can read own record"
  ON collaborators
  FOR SELECT
  USING (auth.uid() = user_id);
