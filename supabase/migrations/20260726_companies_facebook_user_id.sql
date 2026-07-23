-- Identidade real do Facebook (via OAuth, GET /me), usada só no cadastro do
-- plano Gratuito pra impedir múltiplos cadastros gratuitos trocando de e-mail.
-- Diferente de meta_tester_profile, que é texto autodeclarado.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_companies_facebook_user_id ON companies(facebook_user_id) WHERE facebook_user_id IS NOT NULL;
