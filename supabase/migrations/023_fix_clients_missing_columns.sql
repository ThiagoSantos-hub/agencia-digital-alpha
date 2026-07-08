-- Adiciona colunas referenciadas no useClientes.ts e na página de clientes
-- que não existem na tabela clients em nenhuma migration
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS payment_day INTEGER;
