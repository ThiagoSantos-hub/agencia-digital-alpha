-- Colaborador escolhe se o relatório sai pelo WhatsApp da agência (o do admin) ou pelo
-- próprio WhatsApp dele. Usado por app/api/reports/send/route.ts pra decidir qual
-- whatsapp_instances usar no disparo.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS enviar_via_agencia BOOLEAN NOT NULL DEFAULT false;
