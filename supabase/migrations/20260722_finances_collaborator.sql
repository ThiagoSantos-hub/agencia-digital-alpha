-- Liga lançamentos do Financeiro a um colaborador (salário), do mesmo jeito
-- que já existe pra client_id. Usado pra gerar automaticamente a conta a
-- pagar assim que o admin cadastra o salário/frequência/dia de um colaborador.
ALTER TABLE finances
  ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES collaborators(id) ON DELETE CASCADE;
