-- Planos configuráveis (Gratuito, Pro, Max) via tabela em vez de enum fixo em
-- código. IDs (basico/pro/premium/gratuito) são chaves imutáveis; nome, preço
-- e limites são editáveis depois pelo painel /superadmin/planos, sem precisar
-- de migration nova pra cada ajuste.
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_brl NUMERIC(10,2) NOT NULL DEFAULT 0,
  client_limit INTEGER,              -- null = ilimitado
  monthly_reports_limit INTEGER,     -- null = ilimitado
  monthly_alerts_limit INTEGER,      -- null = ilimitado
  stripe_price_id TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
-- Sem policy pública nenhuma de propósito: só o service-role (usado pelas
-- rotas de API) acessa essa tabela. A tela pública /assinar lê via
-- /api/public/plans, nunca direto do navegador — evita expor stripe_price_id.

INSERT INTO plans (id, name, price_brl, client_limit, monthly_reports_limit, monthly_alerts_limit, stripe_price_id, is_free, active, display_order)
VALUES
  ('gratuito', 'Gratuito', 0,   NULL, 20,  20,  NULL, true,  true,  0),
  ('basico',   'Básico',   47,  5,    NULL, NULL, NULL, false, false, 1),
  ('pro',      'Pro',      97,  15,   100, 100, NULL, false, true,  2),
  ('premium',  'Max',      147, NULL, 300, 300, NULL, false, true,  3)
ON CONFLICT (id) DO NOTHING;
