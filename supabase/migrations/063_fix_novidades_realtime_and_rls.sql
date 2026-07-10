-- Migration 063: Corrigir RLS e Realtime da tabela de novidades
-- Objetivo: Garantir que usuários possam marcar novidades como lidas e que o menu atualize em tempo real.

-- 1. Garantir que a política de UPDATE exista e esteja correta
DROP POLICY IF EXISTS "Usuários podem marcar novidades como lidas" ON novidades;
CREATE POLICY "Usuários podem marcar novidades como lidas"
  ON novidades FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Garantir que a tabela esteja na publicação do Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'novidades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE novidades;
  END IF;
END $$;

-- 3. Configurar Replica Identity para FULL para garantir que updates em arrays disparem o Realtime corretamente
ALTER TABLE novidades REPLICA IDENTITY FULL;
