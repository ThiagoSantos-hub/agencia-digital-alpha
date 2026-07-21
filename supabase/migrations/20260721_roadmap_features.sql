-- Modulo "Proximas Atualizacoes": roadmap oficial mostrado aos usuarios,
-- totalmente dinamico (dados no banco, nao texto fixo no codigo) para que o
-- status de cada funcionalidade possa ser atualizado facilmente no futuro
-- (via SQL direto por enquanto; um editor no Superadmin pode vir depois).
-- Mesmo padrao de RLS de "novidades": conteudo global, visivel pra qualquer
-- usuario autenticado (admin ou colaborador, de qualquer empresa), so
-- superadmin escreve.
CREATE TABLE IF NOT EXISTS roadmap_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  benefits        TEXT NOT NULL,
  how_to_use      TEXT NOT NULL,
  problem_solved  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_desenvolvimento', 'em_testes', 'disponivel')),
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roadmap_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmap_features_select_authenticated" ON roadmap_features;
DROP POLICY IF EXISTS "roadmap_features_write_super_admin" ON roadmap_features;

CREATE POLICY "roadmap_features_select_authenticated"
  ON roadmap_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roadmap_features_write_super_admin"
  ON roadmap_features FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
