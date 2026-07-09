-- Migration 058: Corrigir exibição de feedbacks no painel Admin
-- Causa raiz: A coluna colaborador_id referenciava auth.users(id), o que impedia o join automático com public.profiles no PostgREST.
-- Além disso, garantimos que a policy de select para admin esteja correta.

-- 1. Alterar a chave estrangeira para referenciar public.profiles(id)
ALTER TABLE feedbacks 
  DROP CONSTRAINT IF EXISTS feedbacks_colaborador_id_fkey,
  ADD CONSTRAINT feedbacks_colaborador_id_fkey 
    FOREIGN KEY (colaborador_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2. Recriar a policy de select para admin para garantir que use o padrão correto
DROP POLICY IF EXISTS "admin_select_all_feedbacks" ON feedbacks;
CREATE POLICY "admin_select_all_feedbacks"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 3. Garantir que a policy para colaboradores continue funcionando
DROP POLICY IF EXISTS "colaborador_select_own_feedbacks" ON feedbacks;
CREATE POLICY "colaborador_select_own_feedbacks"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (colaborador_id = auth.uid());
