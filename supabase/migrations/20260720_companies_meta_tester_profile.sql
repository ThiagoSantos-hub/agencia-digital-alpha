-- Guarda o perfil do Facebook do admin de cada empresa cliente, coletado já
-- no cadastro em /superadmin/empresas — precisa disso pra adicionar a pessoa
-- como Testadora no App do Facebook antes dela conseguir conectar Meta
-- Ads/Instagram (o App fica em Modo de Desenvolvimento; só funciona pra quem
-- tem papel de Admin/Desenvolvedor/Testador nele).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS meta_tester_profile TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS meta_tester_added BOOLEAN NOT NULL DEFAULT false;
