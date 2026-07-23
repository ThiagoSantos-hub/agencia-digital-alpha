-- ==========================================
-- Autentica a chamada do cron pro /api/reports/send
-- ==========================================
-- Antes, o cron (net.http_post, sem sessão) chamava /api/reports/send sem
-- nenhum header de autenticação, e a própria rota não checava sessão nem
-- dono do relatório. Qualquer requisição com um report_id válido disparava
-- o envio de qualquer empresa. O segredo em si NUNCA fica neste arquivo (o
-- repositório é público): fica guardado em vault.secrets, criado uma única
-- vez via SQL direto (não commitado), com o nome 'reports_cron_secret'. Essa
-- migration só ensina a função a ler o segredo do vault e mandar no header.

CREATE OR REPLACE FUNCTION public.disparar_relatorios_automaticos()
RETURNS void AS $$
DECLARE
  r RECORD;
  url_producao TEXT := 'https://sistema.digitalalpha.store/api/reports/send';
  cron_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'reports_cron_secret';

  IF cron_secret IS NULL THEN
    RAISE EXCEPTION 'reports_cron_secret não encontrado no vault';
  END IF;

  FOR r IN
    SELECT id FROM reports
    WHERE ativo = true
    AND proximo_envio <= NOW()
  LOOP
    PERFORM net.http_post(
      url := url_producao,
      body := json_build_object('report_id', r.id)::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
