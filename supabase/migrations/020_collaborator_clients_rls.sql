-- Colaborador pode ver todos os clientes (apenas leitura, para exibir nomes nas campanhas)
CREATE POLICY "Colaborador vê todos os clientes"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );
