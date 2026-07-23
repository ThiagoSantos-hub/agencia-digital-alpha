-- ==========================================
-- Mascote de onboarding: vídeo de introdução por módulo
-- ==========================================

-- Lista fixa e pré-semeada de módulos/telas que têm vídeo de introdução.
-- Não é freeform como testimonials: só o video_url é editável depois, via
-- /api/superadmin/tutorials.
CREATE TABLE IF NOT EXISTS onboarding_modules (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  path_prefix TEXT NOT NULL,
  surface     TEXT NOT NULL CHECK (surface IN ('admin', 'collaborator', 'superadmin')),
  video_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_modules_select_authenticated" ON onboarding_modules;
CREATE POLICY "onboarding_modules_select_authenticated" ON onboarding_modules
  FOR SELECT TO authenticated USING (true);

-- Log por usuário de "já viu a introdução deste módulo". É por pessoa, não
-- por empresa, então segue o padrão "_own" (igual report_history_select_own),
-- não o padrão company-admin usado em reports/clients/etc.
CREATE TABLE IF NOT EXISTS onboarding_seen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_key  TEXT NOT NULL REFERENCES onboarding_modules(key) ON DELETE CASCADE,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, module_key)
);

ALTER TABLE onboarding_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_seen_select_own" ON onboarding_seen;
CREATE POLICY "onboarding_seen_select_own" ON onboarding_seen
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "onboarding_seen_insert_own" ON onboarding_seen;
CREATE POLICY "onboarding_seen_insert_own" ON onboarding_seen
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seed fixo, só roda se a tabela estiver vazia (mesmo padrão de testimonials).
INSERT INTO onboarding_modules (key, label, path_prefix, surface, sort_order)
SELECT * FROM (VALUES
  ('admin_clientes',       'Clientes',        '/clientes',       'admin', 10),
  ('admin_campanhas',      'Campanhas',       '/campanhas',      'admin', 20),
  ('admin_relatorios',     'Relatórios',      '/relatorios',     'admin', 30),
  ('admin_alertas',        'Alertas',         '/alertas',        'admin', 40),
  ('admin_agenda',         'Agenda',          '/agenda',         'admin', 50),
  ('admin_tarefas',        'Tarefas',         '/tarefas',        'admin', 60),
  ('admin_checklists',     'Checklists',      '/checklists',     'admin', 70),
  ('admin_contratos',      'Contratos',       '/contratos',      'admin', 80),
  ('admin_financeiro',     'Financeiro',      '/financeiro',     'admin', 90),
  ('admin_colaboradores',  'Colaboradores',   '/colaboradores',  'admin', 100),
  ('admin_ai',             'Alpha AI',        '/ai',             'admin', 110),
  ('admin_integracoes',    'Integrações',     '/integracoes',    'admin', 120),
  ('collaborator_meus_clientes', 'Meus Clientes',    '/colaborador/meus-clientes', 'collaborator', 10),
  ('collaborator_clientes',      'Clientes Agência', '/colaborador/clientes',      'collaborator', 20),
  ('collaborator_campanhas',     'Campanhas',        '/colaborador/campanhas',     'collaborator', 30),
  ('collaborator_relatorios',    'Relatórios',       '/colaborador/relatorios',    'collaborator', 40),
  ('collaborator_alertas',       'Alertas',          '/colaborador/alertas',       'collaborator', 50),
  ('collaborator_agenda',        'Agenda',           '/colaborador/agenda',        'collaborator', 60),
  ('collaborator_tarefas',       'Tarefas',          '/colaborador/tarefas',       'collaborator', 70),
  ('collaborator_checklists',    'Checklists',       '/colaborador/checklists',    'collaborator', 80),
  ('collaborator_financeiro',    'Financeiro',       '/colaborador/financeiro',    'collaborator', 90),
  ('collaborator_ai',            'Alpha AI',         '/colaborador/ai',            'collaborator', 100),
  ('collaborator_integracoes',   'Integrações',      '/colaborador/integracoes',   'collaborator', 110),
  ('superadmin_empresas',  'Empresas',   '/superadmin/empresas',  'superadmin', 10),
  ('superadmin_pagamentos','Pagamentos', '/superadmin/pagamentos','superadmin', 20),
  ('superadmin_planos',    'Planos',     '/superadmin/planos',    'superadmin', 30)
) AS seed(key, label, path_prefix, surface, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM onboarding_modules);
