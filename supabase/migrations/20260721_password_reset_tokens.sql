-- "Esqueci minha senha" hoje usa o e-mail de auth padrao do Supabase (SMTP
-- proprio, sem configuracao de remetente) e redireciona pro /dashboard sem
-- nenhuma tela que realmente deixe definir uma senha nova -- por isso nao
-- funcionava pra ninguem. Passa a usar o mesmo Brevo ja usado pro resto do
-- sistema, com um token proprio, e tambem serve pra exigir confirmacao por
-- e-mail na troca de senha feita de dentro do painel (Perfil).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- Só o backend (service role) mexe nessa tabela -- nenhuma policy pra
-- anon/authenticated, o fluxo inteiro passa por rotas de API dedicadas.
