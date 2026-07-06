-- Colaborador pode criar as próprias tarefas
CREATE POLICY "Collaborator inserts own tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );
-- Colaborador pode deletar as próprias tarefas
CREATE POLICY "Collaborator deletes own tasks"
  ON tasks
  FOR DELETE
  USING (
    collaborator_id IN (
      SELECT id FROM collaborators WHERE user_id = auth.uid()
    )
  );
