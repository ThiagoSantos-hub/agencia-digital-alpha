-- ==========================================
-- Rate limiting simples, sem Redis
-- ==========================================
-- Contador por chave (ex: "signup:1.2.3.4") e janela de tempo, incrementado
-- atomicamente via função (evita race condition de duas requisições
-- simultâneas lendo o mesmo contador antes de gravar). Só service-role
-- acessa (sem policy de RLS pra authenticated/anon).

CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem nenhuma policy: só service-role (que ignora RLS) lê/escreve aqui.

CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Limpeza oportunista (1% das chamadas). Evita crescer sem limite sem
  -- precisar de um cron dedicado só pra isso.
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;

  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
