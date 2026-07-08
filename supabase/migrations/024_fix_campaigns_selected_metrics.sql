-- Adiciona a coluna selected_metrics à tabela campaigns
-- A migration 010 continha código React por engano e nunca criou esta coluna
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS selected_metrics JSONB DEFAULT '[]'::jsonb;
