-- Fundo de Cliente: horário em que o lembrete deve chegar (o cron roda de
-- hora em hora, então sem isso o primeiro aviso do dia saía a qualquer hora
-- em que o cron passasse a considerar o vencimento vencido) e forma de
-- pagamento (Pix ou Boleto), que antes o admin tinha que improvisar no nome
-- do alerta.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS horario_envio TEXT DEFAULT '09:00';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'boleto'));
