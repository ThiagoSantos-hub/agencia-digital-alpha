-- Migration 057: Painel de Feedback (Banco + Storage)

-- 1. Criar a tabela de feedbacks
CREATE TABLE IF NOT EXISTS feedbacks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('sugestao', 'bug')),
  titulo          TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  anexo_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' 
                    CHECK (status IN ('pendente', 'em_analise', 'resolvido')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para feedbacks
CREATE POLICY "admin_select_all_feedbacks"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "colaborador_select_own_feedbacks"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (colaborador_id = auth.uid());

CREATE POLICY "colaborador_insert_own_feedbacks"
  ON feedbacks FOR INSERT
  TO authenticated
  WITH CHECK (colaborador_id = auth.uid());

CREATE POLICY "admin_update_feedbacks"
  ON feedbacks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_delete_feedbacks"
  ON feedbacks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 2. Criar bucket no Supabase Storage chamado feedback-anexos
-- Nota: SQL para criar buckets varia conforme a versão do Supabase. 
-- Usaremos a inserção direta na tabela de buckets do schema storage.
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-anexos', 'feedback-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para o storage bucket
-- Permitir upload para usuários autenticados
CREATE POLICY "authenticated_upload_feedback_anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feedback-anexos');

-- Permitir leitura pública para os objetos do bucket
CREATE POLICY "public_read_feedback_anexos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback-anexos');
