-- Flag pra forçar troca de senha no próximo login — usada quando um admin
-- reseta a senha de alguém, quando um colaborador é convidado, ou quando uma
-- nova empresa é criada pelo superadmin (todos esses fluxos hoje mandam a
-- senha em texto puro por e-mail; forçar troca reduz a janela de risco).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
