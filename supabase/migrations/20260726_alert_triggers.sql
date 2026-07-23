-- Log de disparos de alerta, necessário pro limite mensal de alertas do plano
-- (alerts só guarda o timestamp do último disparo, não um histórico contável).
CREATE TABLE IF NOT EXISTS alert_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_company_month ON alert_triggers(company_id, triggered_at);

ALTER TABLE alert_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins veem os disparos de alerta da própria empresa" ON alert_triggers;
CREATE POLICY "Admins veem os disparos de alerta da própria empresa"
  ON alert_triggers FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
