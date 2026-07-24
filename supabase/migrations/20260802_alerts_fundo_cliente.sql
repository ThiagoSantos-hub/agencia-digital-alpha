-- Fundos de anúncio por cliente: lembrete recorrente pra recarregar o saldo
-- da conta de anúncios de um cliente. O Meta não tem API pra debitar
-- cartão/colocar saldo numa conta de anúncios (isso só se faz no Business
-- Manager do próprio Facebook), então o sistema só lembra na data certa e
-- registra o histórico de quando cada fundo foi colocado.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS periodicidade TEXT CHECK (periodicidade IN ('semanal', 'quinzenal', 'mensal', 'anual'));
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS valor_fundo NUMERIC(10,2);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS proximo_vencimento DATE;

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_tipo_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_tipo_check CHECK (tipo IN ('saldo_minimo', 'erro_conta', 'fundo_cliente'));

-- Histórico de quando cada fundo foi efetivamente colocado (o admin confirma
-- manualmente depois de fazer isso no Business Manager do Meta).
CREATE TABLE IF NOT EXISTS client_fund_logs (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id    UUID          NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  client_id   UUID          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id  UUID          NOT NULL DEFAULT get_current_company_id() REFERENCES companies(id),
  user_id     UUID          NOT NULL REFERENCES auth.users(id),
  valor       NUMERIC(10,2) NOT NULL,
  data        DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE client_fund_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_fund_logs_select_company_admin" ON client_fund_logs;
CREATE POLICY "client_fund_logs_select_company_admin" ON client_fund_logs FOR SELECT
  USING (company_id = get_current_company_id() AND is_admin());

DROP POLICY IF EXISTS "client_fund_logs_insert_company_admin" ON client_fund_logs;
CREATE POLICY "client_fund_logs_insert_company_admin" ON client_fund_logs FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
