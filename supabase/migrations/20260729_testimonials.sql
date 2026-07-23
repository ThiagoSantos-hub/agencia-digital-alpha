-- Depoimentos exibidos em /assinar, editáveis em /superadmin/planos.
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  quote TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
-- Sem policy pública: só service-role acessa (mesmo padrão de `plans`). A
-- tela pública /assinar lê via /api/public/testimonials.

-- Semeia só se a tabela ainda estiver vazia (evita duplicar ao reaplicar a migration).
INSERT INTO testimonials (name, role, quote, display_order)
SELECT * FROM (VALUES
  ('Exemplo, trocar depois', 'Dono(a) de agência', 'Texto de exemplo: escreva aqui um depoimento real de um cliente seu quando tiver. Fale sobre o que mudou no dia a dia da agência depois de usar o sistema.', 0),
  ('Exemplo, trocar depois', 'Gestor(a) de tráfego', 'Texto de exemplo: destaque algum resultado concreto, como tempo economizado ou clientes organizados.', 1),
  ('Exemplo, trocar depois', 'Sócio(a) de agência', 'Texto de exemplo: pode falar sobre o suporte, a facilidade de uso, ou o que fez decidir assinar.', 2)
) AS seed(name, role, quote, display_order)
WHERE NOT EXISTS (SELECT 1 FROM testimonials);
