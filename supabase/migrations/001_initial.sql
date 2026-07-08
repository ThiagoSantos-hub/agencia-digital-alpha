-- ==========================================
-- AGÊNCIA DIGITAL ALPHA — Migration Inicial
-- ==========================================

-- Tabela de perfis (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager')) DEFAULT 'manager',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuário vê o próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin vê todos os perfis"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger para criar profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Tabelas futuras (estrutura base)
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT CHECK (status IN ('ativo', 'inativo', 'prospecto')) DEFAULT 'ativo',
  manager_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('ativa', 'pausada', 'finalizada', 'rascunho')) DEFAULT 'rascunho',
  channel TEXT CHECK (channel IN ('meta_ads', 'google_ads', 'organico', 'outro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS nas tabelas futuras
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
