-- Impede cadastrar cliente acima do limite do plano da empresa (basico: 5,
-- pro: 15, premium/sem plano definido: sem limite). Trigger em vez de checagem
-- só no frontend porque o insert de clients acontece direto do navegador
-- (supabase-js), não passa por uma rota de API que eu pudesse validar ali.
CREATE OR REPLACE FUNCTION enforce_client_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM companies WHERE id = NEW.company_id;

  v_limit := CASE v_plan
    WHEN 'basico' THEN 5
    WHEN 'pro' THEN 15
    ELSE NULL -- premium ou empresa sem plano definido (cadastro manual antigo) = sem limite
  END;

  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM clients WHERE company_id = NEW.company_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Limite de % clientes do seu plano atingido. Faça upgrade do plano pra cadastrar mais.', v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_client_plan_limit ON clients;
CREATE TRIGGER trg_enforce_client_plan_limit
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION enforce_client_plan_limit();
