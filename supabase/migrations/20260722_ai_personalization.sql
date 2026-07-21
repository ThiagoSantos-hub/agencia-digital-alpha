-- Personalizacao da Alpha por usuario: como a pessoa quer ser chamada e um
-- resumo livre do jeito dela trabalhar. Antes disso a IA inteira chamava
-- todo mundo de "diretor" e usava notas pessoais fixas do Thiago como
-- "segundo cerebro" padrao de qualquer usuario novo, o que nao fazia
-- sentido nenhum fora da conta dele.
ALTER TABLE personal_ai_keys
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS work_context TEXT;
