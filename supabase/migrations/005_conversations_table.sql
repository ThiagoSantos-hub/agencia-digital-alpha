-- ==========================================
-- Migration 005 — Tabela de Conversas (Memória da Alpha)
-- Agência Digital Alpha
-- ==========================================

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript  JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- O usuário pode ver suas próprias conversas
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- O usuário pode inserir suas próprias conversas
CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin pode ver todas as conversas
CREATE POLICY "conversations_select_admin"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
