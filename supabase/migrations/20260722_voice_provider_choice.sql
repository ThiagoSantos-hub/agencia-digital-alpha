-- Cada usuário escolhe qual IA/voz o botão de microfone flutuante usa: a
-- Alpha própria (fala com o navegador, cérebro em texto + TTS) ou o agente
-- de conversa do ElevenLabs. Antes disso só existia o ElevenLabs disponível
-- depois da consolidação dos dois botões num só.
ALTER TABLE personal_ai_keys
  ADD COLUMN IF NOT EXISTS voice_provider TEXT NOT NULL DEFAULT 'elevenlabs'
    CHECK (voice_provider IN ('alpha', 'elevenlabs'));
