-- Texto livre editável no painel /superadmin/planos, explicando o benefício e
-- o problema que o plano resolve — mostrado na tela pública /assinar.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT;
