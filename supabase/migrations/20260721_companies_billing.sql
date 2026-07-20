-- Suporte a cadastro publico com pagamento (Stripe): assinatura recorrente
-- por cartao ou pagamento avulso por Pix (+10%, 30 dias de acesso, renovacao
-- manual). companies.active continua sendo o UNICO campo que o middleware
-- olha pra bloquear acesso -- essas colunas novas so alimentam esse campo ou
-- servem de informacao/diagnostico no Superadmin.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('card', 'pix'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
