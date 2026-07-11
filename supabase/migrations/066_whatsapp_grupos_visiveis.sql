-- Permite o admin/gestor controlar se colaboradores podem ver seus grupos WhatsApp
ALTER TABLE whatsapp_instances
  ADD COLUMN IF NOT EXISTS grupos_visiveis_colaboradores BOOLEAN NOT NULL DEFAULT false;
