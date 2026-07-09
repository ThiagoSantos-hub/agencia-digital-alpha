CREATE TABLE novidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lida_por UUID[] DEFAULT '{}'
);
