'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Video, 
  Share2, 
  TrendingUp, 
  Search, 
  HardDrive,
  Cpu,
  Save,
  Lock
} from 'lucide-react'

type IntegrationType = 'openai' | 'elevenlabs' | 'whatsapp' | 'meta_ads' | 'google_ads' | 'google_drive'

interface Integration {
  id?: string
  type: IntegrationType
  api_key: string | null
  is_admin?: boolean
}

export default function IntegracoesColaboradorPage() {
  const { user } = useAuth()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [adminIntegrations, setAdminIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        // 1. Buscar ID do colaborador
        const { data: collaborator } = await supabase
          .from('collaborators')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!collaborator) return
        setCollaboratorId(collaborator.id)

        // 2. Buscar integrações do colaborador
        const { data: collabIntegrations } = await supabase
          .from('collaborator_integrations')
          .select('*')
          .eq('collaborator_id', collaborator.id)

        setIntegrations(collabIntegrations || [])

        // 3. Buscar integrações do admin (para exibição somente leitura)
        // Nota: Assumindo que o admin é identificado por role ou tabela específica
        // Para esta tarefa, vamos simular que buscamos de uma tabela de configurações globais ou similar
        const { data: adminData } = await supabase
          .from('admin_integrations') // Ajustar se o nome da tabela for outro
          .select('type')
        
        setAdminIntegrations(adminData?.map(i => ({ ...i, is_admin: true, api_key: '********' })) || [])

      } catch (error) {
        console.error('Erro ao buscar integrações:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  const handleSave = async (type: IntegrationType, apiKey: string) => {
    if (!collaboratorId) return
    setSaving(type)

    try {
      const existing = integrations.find(i => i.type === type)

      if (existing) {
        const { error } = await supabase
          .from('collaborator_integrations')
          .update({ api_key: apiKey, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('collaborator_integrations')
          .insert([{
            collaborator_id: collaboratorId,
            type,
            api_key: apiKey
          }])

        if (error) throw error
      }

      // Recarregar dados
      const { data: updated } = await supabase
        .from('collaborator_integrations')
        .select('*')
        .eq('collaborator_id', collaboratorId)
      
      setIntegrations(updated || [])
      alert('Integração atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar integração:', error)
      alert('Erro ao salvar integração.')
    } finally {
      setSaving(null)
    }
  }

  const IntegrationCard = ({ 
    type, 
    title, 
    description, 
    icon: Icon, 
    color, 
    bg,
    canEdit = true,
    isAdmin = false
  }: { 
    type: IntegrationType, 
    title: string, 
    description: string, 
    icon: any, 
    color: string, 
    bg: string,
    canEdit?: boolean,
    isAdmin?: boolean
  }) => {
    const integration = integrations.find(i => i.type === type)
    const [apiKey, setApiKey] = useState(integration?.api_key || '')
    const isConnected = !!integration?.api_key

    return (
      <div className={`bg-[#0a0f0c] border ${isAdmin ? 'border-blue-500/20' : 'border-[#1a3a24]'} p-6 rounded-2xl flex flex-col h-full group hover:border-emerald-500/30 transition-all shadow-sm`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
            <Icon size={20} />
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider">
              <Lock size={10} />
              Admin
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 size={10} />
              Conectado
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 text-[10px] font-black uppercase tracking-wider">
              <AlertCircle size={10} />
              Pendente
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 mb-6">
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {description}
          </p>
        </div>

        {canEdit ? (
          <div className="space-y-3">
            <div className="relative">
              <input 
                type="password" 
                placeholder="Insira sua API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <button 
              onClick={() => handleSave(type, apiKey)}
              disabled={saving === type || !apiKey}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {saving === type ? 'Salvando...' : isConnected ? 'Atualizar' : 'Conectar'}
            </button>
          </div>
        ) : (
          <div className="mt-auto pt-4 border-t border-[#1a3a24]">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1">Status</p>
            <p className="text-xs text-emerald-500 font-medium">Ativo pela agência</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 py-16 text-center text-gray-500 italic">
        Carregando integrações...
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrações</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie suas chaves de API e visualize as integrações da agência.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* OpenAI */}
        <IntegrationCard 
          type="openai"
          title="OpenAI"
          description="Utilize sua própria chave para gerar conteúdos e análises com modelos GPT."
          icon={Cpu}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />

        {/* ElevenLabs */}
        <IntegrationCard 
          type="elevenlabs"
          title="ElevenLabs"
          description="Gere vozes ultra-realistas com sua própria conta ElevenLabs."
          icon={Video}
          color="text-purple-400"
          bg="bg-purple-400/10"
        />

        {/* WhatsApp Admin */}
        <IntegrationCard 
          type="whatsapp"
          title="WhatsApp (Agência)"
          description="Conexão oficial da agência para disparo de mensagens."
          icon={MessageSquare}
          color="text-blue-400"
          bg="bg-blue-400/10"
          canEdit={false}
          isAdmin={true}
        />

        {/* WhatsApp Pessoal */}
        <IntegrationCard 
          type="whatsapp"
          title="WhatsApp Pessoal"
          description="Conecte seu próprio número para automações individuais."
          icon={MessageSquare}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />

        {/* Meta Ads Admin */}
        <IntegrationCard 
          type="meta_ads"
          title="Meta Ads (Agência)"
          description="Acesso às contas de anúncio gerenciadas pela agência."
          icon={TrendingUp}
          color="text-blue-400"
          bg="bg-blue-400/10"
          canEdit={false}
          isAdmin={true}
        />

        {/* Meta Ads Pessoal */}
        <IntegrationCard 
          type="meta_ads"
          title="Meta Ads Pessoal"
          description="Vincule sua conta de anúncios pessoal para gestão direta."
          icon={TrendingUp}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />

        {/* Google Ads Admin */}
        <IntegrationCard 
          type="google_ads"
          title="Google Ads (Agência)"
          description="Acesso às contas Google Ads da agência."
          icon={Search}
          color="text-blue-400"
          bg="bg-blue-400/10"
          canEdit={false}
          isAdmin={true}
        />

        {/* Google Ads Pessoal */}
        <IntegrationCard 
          type="google_ads"
          title="Google Ads Pessoal"
          description="Vincule sua conta Google Ads pessoal."
          icon={Search}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />

        {/* Google Drive */}
        <IntegrationCard 
          type="google_drive"
          title="Google Drive"
          description="Acesse e gerencie seus arquivos e documentos do Drive."
          icon={HardDrive}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
      </div>
    </div>
  )
}
