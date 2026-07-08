-- Remove a política RLS antiga que usa raw_user_meta_data
-- (não funciona para admin criado via dashboard do Supabase)
DROP POLICY IF EXISTS "Admin full access tasks" ON tasks;

-- Cria nova política usando a função is_admin()
-- que consulta a tabela profiles corretamente
CREATE POLICY "Admin full access tasks" ON tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
