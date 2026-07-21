-- Agente de voz da ElevenLabs deixa de ser um unico agente fixo (so pra
-- empresa dona da plataforma) e vira algo que cada usuario, de qualquer
-- empresa, configura por conta propria. `alpha_webhook_secret` e gerado
-- automaticamente na primeira vez que o usuario salva a chave da ElevenLabs
-- -- e o valor que ele cola manualmente no proprio agente (configurado por
-- ele mesmo no painel da ElevenLabs) pra identificar de qual usuario/empresa
-- e cada chamada de ferramenta que chega no backend.
ALTER TABLE personal_ai_keys
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT,
  ADD COLUMN IF NOT EXISTS alpha_webhook_secret TEXT UNIQUE;
