-- Fix: recursão infinita na política RLS "Admin vê todos os perfis"
-- Problema: a política consultava profiles dentro da RLS de profiles → loop infinito → erro 500
-- Solução: criar função SECURITY DEFINER que executa fora do contexto RLS

DROP POLICY IF EXISTS "Admin vê todos os perfis" ON profiles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Admin vê todos os perfis"
  ON profiles FOR SELECT
  USING (public.is_admin());
