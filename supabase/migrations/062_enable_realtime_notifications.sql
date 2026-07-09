-- Migration 062: Habilitar Realtime para a tabela notifications
-- Objetivo: Garantir que as notificações apareçam em tempo real no sino do Header.

-- No Supabase, a publicação 'supabase_realtime' controla quais tabelas enviam eventos em tempo real.
-- O bloco abaixo tenta adicionar a tabela à publicação, tratando o erro caso já exista.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
