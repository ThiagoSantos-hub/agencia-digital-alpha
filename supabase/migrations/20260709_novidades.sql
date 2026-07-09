-- Migration: Criar tabela de novidades e configurar RLS
CREATE TABLE IF NOT EXISTS novidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lida_por UUID[] DEFAULT '{}'
);

-- Ativar RLS (Row Level Security)
ALTER TABLE novidades ENABLE ROW LEVEL SECURITY;

-- 1. Qualquer usuário autenticado pode ver as novidades
CREATE POLICY "Usuários autenticados podem ver novidades"
  ON novidades FOR SELECT
  TO authenticated
  USING (true);

-- 2. Apenas administradores podem inserir novidades
CREATE POLICY "Apenas admins podem inserir novidades"
  ON novidades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Apenas administradores podem excluir novidades
CREATE POLICY "Apenas admins podem excluir novidades"
  ON novidades FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Usuários podem atualizar as novidades (marcar como lida)
CREATE POLICY "Usuários podem marcar novidades como lidas"
  ON novidades FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Habilitar Realtime para a tabela de novidades
ALTER PUBLICATION supabase_realtime ADD TABLE novidades;
