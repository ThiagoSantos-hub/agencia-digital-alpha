-- Reescreve enforce_client_plan_limit() (criada em 20260721) pra ler o limite
-- de clientes da tabela plans em vez do CASE fixo, já que o número agora é
-- editável pelo painel /superadmin/planos.
CREATE OR REPLACE FUNCTION enforce_client_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM companies WHERE id = NEW.company_id;

  IF v_plan IS NULL THEN
    RETURN NEW; -- empresa sem plano definido (cadastro manual antigo) = sem limite
  END IF;

  SELECT client_limit INTO v_limit FROM plans WHERE id = v_plan;

  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM clients WHERE company_id = NEW.company_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Limite de % clientes do seu plano atingido. Faça upgrade do plano pra cadastrar mais.', v_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
