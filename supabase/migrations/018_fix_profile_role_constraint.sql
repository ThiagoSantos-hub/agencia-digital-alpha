-- Migration 018: Atualizar constraint de role na tabela profiles para incluir 'collaborator'

-- 1. Remover a constraint antiga
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Adicionar a nova constraint com 'collaborator' incluído
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'manager', 'collaborator'));
