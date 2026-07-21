-- Permite que o admin controle, por colaborador, se a tela de Agenda
-- (que expoe o Gmail/Google Agenda pessoal conectado por cada um) fica
-- visivel ou nao. Comeca habilitado pra nao esconder a feature nova de
-- ninguem sem o admin decidir ativamente desligar.
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS agenda_enabled BOOLEAN NOT NULL DEFAULT true;
