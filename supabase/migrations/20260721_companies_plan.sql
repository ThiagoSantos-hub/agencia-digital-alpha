-- Planos com limite de clientes: basico (R$47, ate 5 clientes), pro (R$97,
-- ate 15 clientes), premium (R$147, ilimitado). Colaboradores nao tem limite
-- em nenhum plano.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('basico', 'pro', 'premium'));
