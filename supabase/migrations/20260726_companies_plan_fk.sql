-- companies.plan deixa de ser um CHECK fixo (basico/pro/premium) e vira FK
-- pra plans.id — permite criar planos novos (ex: gratuito) sem migration.
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
  WHERE con.conrelid = 'companies'::regclass
    AND con.contype = 'c'
    AND att.attname = 'plan';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE companies DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE companies
  ADD CONSTRAINT companies_plan_fkey FOREIGN KEY (plan) REFERENCES plans(id);
