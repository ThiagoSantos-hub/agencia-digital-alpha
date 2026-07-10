-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Migration 020
-- Cron Job: Disparo Automático de Relatórios
-- ==========================================

-- Garantir que pg_cron está ativo (já foi ativado anteriormente)
-- Garantir que pg_net está ativo para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que busca relatórios devidos e chama a API de envio
CREATE OR REPLACE FUNCTION public.disparar_relatorios_automaticos()
RETURNS void AS $$
DECLARE
  r RECORD;
  url_producao TEXT := 'https://agencia-digital-alpha.vercel.app/api/reports/send';
BEGIN
  FOR r IN
    SELECT id FROM reports
    WHERE ativo = true
    AND proximo_envio <= NOW()
  LOOP
    PERFORM net.http_post(
      url := url_producao,
      body := json_build_object('report_id', r.id)::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job: roda a cada hora verificando relatórios devidos
-- Primeiro remove se já existir para evitar duplicidade
SELECT cron.unschedule('disparar-relatorios-automaticos');
SELECT cron.schedule(
  'disparar-relatorios-automaticos',
  '0 * * * *',
  'SELECT public.disparar_relatorios_automaticos()'
);
