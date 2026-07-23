-- Registro de quando a empresa aceitou os Termos de Uso/Política de
-- Privacidade no cadastro público. Evidência de consentimento, gravada com
-- o horário do servidor no momento da requisição (não confia no relógio do
-- navegador de quem se cadastrou).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
