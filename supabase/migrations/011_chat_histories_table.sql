-- ==========================================
-- Migration 011 — Tabela de Histórico de Chat (Memória de Sessão)
-- Agência Digital Alpha
-- ==========================================

CREATE TABLE IF NOT EXISTS chat_histories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_histories_user_id_key UNIQUE (user_id)
);

-- Ativar RLS
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "chat_histories_select_own"
  ON chat_histories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_histories_insert_own"
  ON chat_histories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_histories_update_own"
  ON chat_histories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
