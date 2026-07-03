-- ==========================================
-- Fix: Políticas RLS para tabela campaigns
-- Sem isso, SELECT retorna [] mesmo com dados
-- Agência Digital Alpha
-- ==========================================

-- Admin vê todas as campanhas
CREATE POLICY "Admin vê todas as campanhas"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode inserir campanhas
CREATE POLICY "Admin insere campanhas"
  ON campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode atualizar campanhas
CREATE POLICY "Admin atualiza campanhas"
  ON campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin pode deletar campanhas
CREATE POLICY "Admin deleta campanhas"
  ON campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager vê campanhas dos seus clientes
CREATE POLICY "Manager vê campanhas dos seus clientes"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = campaigns.client_id
        AND clients.manager_id = auth.uid()
    )
  );
