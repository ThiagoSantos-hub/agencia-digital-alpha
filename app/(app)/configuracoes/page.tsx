'use client'

import { useState, useEffect } from 'react'
import { Settings, RotateCcw, Save, Layout, Palette, Type, MousePointer2, Sparkles, Bell, User } from 'lucide-react'
import { useAgencySettings, AgencySettingsMap } from '@/hooks/useAgencySettings'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function ConfiguracoesVisuaisPage() {
  const { settings: savedSettings, loading, saveAllSettings, resetToDefaults } = useAgencySettings()
  const [localSettings, setLocalSettings] = useState<AgencySettingsMap>(savedSettings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(savedSettings)
  }, [savedSettings])

  const handleUpdateLocal = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await saveAllSettings(localSettings)
    setIsSaving(false)
  }

  const handleReset = async () => {
    if (confirm('Deseja realmente restaurar as configurações padrão?')) {
      await resetToDefaults()
    }
  }

  // Estilos dinâmicos para o Preview
  const previewStyles = {
    '--color-primary': localSettings.color_primary,
    '--color-cta': localSettings.color_cta,
    '--color-background': localSettings.color_background,
    '--color-sidebar': localSettings.color_sidebar,
    '--color-header': localSettings.color_header,
    '--color-text-main': localSettings.color_text_main,
    '--color-text-muted': localSettings.color_text_muted,
    '--button-radius': localSettings.button_radius === 'rounded-full' ? '9999px' : localSettings.button_radius === 'rounded-none' ? '0px' : '8px',
    '--font-family': localSettings.font_family,
    '--font-size-base': localSettings.font_size_base,
    '--font-weight-title': localSettings.font_weight_title,
  } as React.CSSProperties

  if (loading && Object.keys(localSettings).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="text-primary" size={24} />
          <h1 className="text-2xl font-black text-text-main tracking-tight">Configurações Visuais</h1>
        </div>
        <p className="text-text-muted text-sm font-medium">Personalize a aparência do sistema para todos os usuários</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna de Controles */}
        <div className="space-y-6">
          {/* Seção: Cores */}
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Palette size={18} className="text-primary" />
              <h2 className="text-text-main font-bold text-sm uppercase tracking-widest">Identidade Visual (Cores)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorInput 
                label="Cor Primária" 
                value={localSettings.color_primary} 
                onChange={(v) => handleUpdateLocal('color_primary', v)} 
              />
              <ColorInput 
                label="Cor CTA (Ação)" 
                value={localSettings.color_cta} 
                onChange={(v) => handleUpdateLocal('color_cta', v)} 
              />
              <ColorInput 
                label="Fundo das Páginas" 
                value={localSettings.color_background} 
                onChange={(v) => handleUpdateLocal('color_background', v)} 
              />
              <ColorInput 
                label="Fundo da Sidebar" 
                value={localSettings.color_sidebar} 
                onChange={(v) => handleUpdateLocal('color_sidebar', v)} 
              />
              <ColorInput 
                label="Fundo do Header" 
                value={localSettings.color_header} 
                onChange={(v) => handleUpdateLocal('color_header', v)} 
              />
              <ColorInput 
                label="Texto Principal" 
                value={localSettings.color_text_main} 
                onChange={(v) => handleUpdateLocal('color_text_main', v)} 
              />
              <ColorInput 
                label="Texto Secundário" 
                value={localSettings.color_text_muted} 
                onChange={(v) => handleUpdateLocal('color_text_muted', v)} 
              />
            </div>
          </Card>

          {/* Seção: Botões */}
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <MousePointer2 size={18} className="text-primary" />
              <h2 className="text-text-main font-bold text-sm uppercase tracking-widest">Estilo de Botões</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Formato</label>
                <div className="flex gap-2">
                  {['rounded-none', 'rounded-lg', 'rounded-full'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleUpdateLocal('button_radius', r)}
                      className={`px-4 py-2 text-xs font-bold border rounded-lg transition-all ${
                        localSettings.button_radius === r 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-surface text-text-muted border-border hover:bg-hover-bg'
                      }`}
                    >
                      {r === 'rounded-none' ? 'Quadrado' : r === 'rounded-lg' ? 'Arredondado' : 'Pill'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Seção: Tipografia */}
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Type size={18} className="text-primary" />
              <h2 className="text-text-main font-bold text-sm uppercase tracking-widest">Tipografia</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Família de Fonte</label>
                <select 
                  value={localSettings.font_family}
                  onChange={(e) => handleUpdateLocal('font_family', e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-primary"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Nunito">Nunito</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted uppercase mb-2 block">Tamanho Base</label>
                <select 
                  value={localSettings.font_size_base}
                  onChange={(e) => handleUpdateLocal('font_size_base', e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-primary"
                >
                  <option value="13px">Pequeno (13px)</option>
                  <option value="14px">Normal (14px)</option>
                  <option value="16px">Grande (16px)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna de Preview */}
        <div className="sticky top-6">
          <div 
            style={previewStyles}
            className="rounded-xl border border-border overflow-hidden shadow-2xl bg-[var(--color-background)] transition-all duration-300"
          >
            <div className="bg-primary/10 px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Preview em Tempo Real</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            </div>

            <div className="flex h-[500px] font-[var(--font-family)] text-[var(--font-size-base)]">
              {/* Sidebar Simulada */}
              <div className="w-48 border-r border-border flex flex-col transition-all duration-300" style={{ backgroundColor: 'var(--color-sidebar)' }}>
                <div className="p-4 border-b border-border mb-4">
                  <div className="h-6 w-24 bg-primary/20 rounded animate-pulse" />
                </div>
                <div className="px-2 space-y-1">
                  <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary flex items-center gap-2 font-bold text-xs">
                    <Layout size={14} /> Dashboard
                  </div>
                  <div className="px-3 py-2 rounded-lg text-[var(--color-text-muted)] flex items-center gap-2 font-medium text-xs">
                    <User size={14} /> Clientes
                  </div>
                  <div className="px-3 py-2 rounded-lg text-[var(--color-text-muted)] flex items-center gap-2 font-medium text-xs">
                    <Sparkles size={14} /> Novidades
                  </div>
                </div>
              </div>

              {/* Conteúdo Simulado */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Simulado */}
                <div className="h-14 border-b border-border px-6 flex items-center justify-between transition-all duration-300" style={{ backgroundColor: 'var(--color-header)' }}>
                  <div className="h-4 w-32 bg-hover-bg rounded" />
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-[var(--color-text-muted)]" />
                    <div className="w-8 h-8 rounded-full bg-primary/20" />
                  </div>
                </div>

                {/* Body Simulado */}
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="space-y-1">
                    <h3 
                      className="text-[var(--color-text-main)] transition-all"
                      style={{ fontWeight: localSettings.font_weight_title, fontSize: '1.25rem' }}
                    >
                      Olá, Administrador!
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-xs font-medium">Veja como o sistema está ficando.</p>
                  </div>

                  <div className="bg-surface border border-border p-5 shadow-sm transition-all" style={{ borderRadius: 'var(--button-radius)' }}>
                    <h4 className="text-[var(--color-text-main)] font-bold text-sm mb-2">Card de Exemplo</h4>
                    <p className="text-[var(--color-text-muted)] text-xs leading-relaxed mb-6">
                      Este é um exemplo de como os textos e containers serão exibidos com as cores escolhidas.
                    </p>
                    <div className="flex gap-3">
                      <button 
                        className="px-4 py-2 text-white text-xs font-bold shadow-sm transition-all"
                        style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--button-radius)' }}
                      >
                        Botão Primário
                      </button>
                      <button 
                        className="px-4 py-2 text-white text-xs font-bold shadow-sm transition-all"
                        style={{ backgroundColor: 'var(--color-cta)', borderRadius: 'var(--button-radius)' }}
                      >
                        Botão CTA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé de Ações */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 flex items-center justify-center gap-4 z-50">
        <Button
          variant="ghost"
          onClick={handleReset}
          icon={<RotateCcw size={18} />}
        >
          Restaurar padrão
        </Button>
        <Button
          variant="cta"
          onClick={handleSave}
          loading={isSaving}
          icon={<Save size={18} />}
          className="min-w-[200px]"
        >
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-text-disabled uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <div 
          className="w-10 h-10 rounded-lg border border-border shadow-sm cursor-pointer flex-shrink-0"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.getElementById(`color-${label}`)
            input?.click()
          }}
        />
        <input 
          id={`color-${label}`}
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-primary uppercase"
        />
      </div>
    </div>
  )
}
