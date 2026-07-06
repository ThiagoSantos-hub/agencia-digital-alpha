-- Permitir que colaboradores criem seus próprios clientes
CREATE POLICY "Colaborador pode criar clientes"
  ON clients FOR INSERT
  WITH CHECK (
    auth.uid() = manager_id AND
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );

-- Permitir que colaboradores vejam apenas seus próprios clientes (ou todos se já houver política de leitura global, mas esta garante o acesso aos dele)
CREATE POLICY "Colaborador gerencia seus próprios clientes"
  ON clients FOR ALL
  USING (
    auth.uid() = manager_id AND
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.user_id = auth.uid()
    )
  );
