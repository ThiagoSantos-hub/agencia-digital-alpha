-- Migration 013: Adicionar campos de salário em collaborators
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS salary_frequency TEXT
    CHECK (salary_frequency IN ('mensal', 'quinzenal', 'semanal')),
  ADD COLUMN IF NOT EXISTS salary_day INTEGER
    CHECK (salary_day BETWEEN 1 AND 31);
