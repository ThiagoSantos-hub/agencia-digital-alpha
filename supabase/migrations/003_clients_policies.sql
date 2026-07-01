-- Políticas RLS para clients
-- Admin vê e edita todos os clientes
-- Manager vê e edita apenas os clientes onde manager_id = seu próprio id
-- Apenas Admin pode deletar

CREATE POLICY "Admin ve todos os clientes"
  ON clients FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Manager ve seus clientes"
  ON clients FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "Admin e Manager podem criar clientes"
  ON clients FOR INSERT
  WITH CHECK (public.is_admin() OR manager_id = auth.uid());

CREATE POLICY "Admin edita qualquer cliente"
  ON clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Manager edita seus clientes"
  ON clients FOR UPDATE
  USING (manager_id = auth.uid());

CREATE POLICY "Somente admin deleta clientes"
  ON clients FOR DELETE
  USING (public.is_admin());
