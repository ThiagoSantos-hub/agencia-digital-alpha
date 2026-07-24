-- Colaborador não cadastra cliente novo nunca mais, só admin. Casa com a
-- decisão de virar "painel de funcionário": ele trabalha nos clientes que a
-- empresa já tem, não cria os próprios.
DROP POLICY IF EXISTS "clients_insert_company" ON clients;
CREATE POLICY "clients_insert_company_admin" ON clients FOR INSERT
  WITH CHECK (company_id = get_current_company_id() AND is_admin());
