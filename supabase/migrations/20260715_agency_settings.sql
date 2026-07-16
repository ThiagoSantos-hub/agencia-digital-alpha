CREATE TABLE agency_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública" ON agency_settings
  FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode editar" ON agency_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO agency_settings (key, value) VALUES
  ('color_primary', '#1A56DB'),
  ('color_cta', '#16A34A'),
  ('color_background', '#F8FAFC'),
  ('color_sidebar', '#FFFFFF'),
  ('color_header', '#FFFFFF'),
  ('color_text_main', '#1E293B'),
  ('color_text_muted', '#64748B'),
  ('button_radius', 'rounded-lg'),
  ('button_size', 'md'),
  ('button_style', 'solid'),
  ('font_family', 'Inter'),
  ('font_size_base', '14px'),
  ('font_weight_title', '600')
ON CONFLICT (key) DO NOTHING;
