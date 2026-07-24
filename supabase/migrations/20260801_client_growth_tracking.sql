-- Módulo "Acompanhamento do Cliente": histórico diário de Meta Ads +
-- Instagram (crescimento) e diagnósticos gerados por IA, por cliente.

CREATE TABLE IF NOT EXISTS client_metrics_daily (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  metric_date      DATE NOT NULL,
  source           TEXT NOT NULL CHECK (source IN ('meta_ads', 'instagram')),
  impressions      INTEGER,
  reach            INTEGER,
  clicks           INTEGER,
  spend            NUMERIC,
  leads            INTEGER,
  purchases        INTEGER,
  followers_count  INTEGER,
  profile_views    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, metric_date, source)
);
ALTER TABLE client_metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_metrics_daily_select_company" ON client_metrics_daily;
CREATE POLICY "client_metrics_daily_select_company" ON client_metrics_daily FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE company_id = get_current_company_id()));
-- sem policy de insert/update/delete: só o service-role (snapshot diário) escreve

CREATE TABLE IF NOT EXISTS client_ai_analyses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  generated_by  UUID NOT NULL REFERENCES profiles(id),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE client_ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_ai_analyses_select_company" ON client_ai_analyses;
CREATE POLICY "client_ai_analyses_select_company" ON client_ai_analyses FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE company_id = get_current_company_id()));
-- insert é feito pela própria API route com service-role, nunca direto do navegador

CREATE INDEX IF NOT EXISTS idx_client_metrics_daily_client_date ON client_metrics_daily (client_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_ai_analyses_client_date ON client_ai_analyses (client_id, generated_at DESC);

-- O segredo 'client_metrics_cron_secret' é inserido no Vault à parte, via SQL
-- direto (não commitado aqui), mesmo padrão de reports_cron_secret em
-- 20260731_reports_send_auth.sql; esta migration só assume que ele já existe.
CREATE OR REPLACE FUNCTION public.disparar_snapshot_metricas_clientes()
RETURNS void AS $$
DECLARE
  secret TEXT;
BEGIN
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'client_metrics_cron_secret';
  IF secret IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://sistema.digitalalpha.store/api/clients/metrics-snapshot',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DO $$
BEGIN
  PERFORM cron.unschedule('snapshot-metricas-clientes');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'snapshot-metricas-clientes',
  '0 6 * * *',
  'SELECT public.disparar_snapshot_metricas_clientes()'
);
