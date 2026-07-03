-- ==========================================
-- Migration 006 — Atualização de Status de Clientes
-- Agência Digital Alpha
-- ==========================================

-- 1. Remover a restrição antiga de status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- 2. Adicionar a nova restrição de status (sem prospecto, com atrasado)
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('ativo', 'inativo', 'atrasado'));

-- 3. Converter 'prospecto' para 'ativo' (já que prospecto será removido)
UPDATE clients SET status = 'ativo' WHERE status = 'prospecto';

-- 4. Adicionar coluna inativo_em
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inativo_em TIMESTAMPTZ;

-- 5. Comentário explicativo
COMMENT ON COLUMN clients.inativo_em IS 'Data e hora em que o cliente foi marcado como inativo';
