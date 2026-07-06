-- Colaborador pode ver todas as campanhas (assim como o admin)
CREATE POLICY "Colaborador vê todas as campanhas"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );
