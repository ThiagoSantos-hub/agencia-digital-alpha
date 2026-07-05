-- Migration 016: Financeiro pessoal do colaborador

CREATE TABLE IF NOT EXISTS collaborator_finance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'gasto')),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS collaborator_finance_collaborator_id_idx
  ON collaborator_finance(collaborator_id);

-- RLS: somente o próprio colaborador acessa
ALTER TABLE collaborator_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborator owns finance"
  ON collaborator_finance
  FOR ALL
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );
