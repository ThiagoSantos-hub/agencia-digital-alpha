-- ====================================================================
-- SCRIPT PARA ATIVAR O REALTIME (TEMPO REAL) NO SUPABASE
-- Execute este script para que as tarefas e notificações apareçam na hora!
-- ====================================================================

-- 1. Habilitar o Realtime para a tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Habilitar o Realtime para a tabela de tarefas
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Caso a publicação não exista (raro), use este comando antes:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
