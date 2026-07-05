'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Megaphone, 
  Search, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: 'planejamento' | 'ativa' | 'pausada' | 'finalizada'
  start_date: string | null
  end_date: string | null
  client_id: string | null
  clients?: { name: string } | null
}

export default function ColaboradorCampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select(`*, clients(name)`)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCampaigns(data || [])
      } catch (error) {
        console.error('Erro ao buscar campanhas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [supabase])

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.clients?.name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [campaigns, search])

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'planejamento': return { label: 'Planejamento', color: 'text-gray-400', icon: Clock, bg: 'bg-gray-400/10' }
      case 'ativa': return { label: 'Ativa', color: 'text-emerald-400', icon: Megaphone, bg: 'bg-emerald-400/10' }
      case 'pausada': return { label: 'Pausada', color: 'text-amber-400', icon: AlertCircle, bg: 'bg-amber-400/10' }
      case 'finalizada': return { label: 'Finalizada', color: 'text-blue-400', icon: CheckCircle2, bg: 'bg-blue-400/10' }
      default: return { label: status, color: 'text-gray-400', icon: Clock, bg: 'bg-gray-400/10' }
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Campanhas</h1>
        <p className="text-gray-400 text-sm mt-1">Visualize as campanhas ativas e planejadas da agência.</p>
      </div>

      {/* Filtro */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar campanhas ou clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* Grid de Campanhas */}
      {loading ? (
        <div className="py-12 text-center text-gray-500 italic">Carregando campanhas...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="py-12 text-center text-gray-500 italic border-2 border-dashed border-[#1a3a24] rounded-2xl">
          Nenhuma campanha encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const status = getStatusInfo(campaign.status)
            const StatusIcon = status.icon

            return (
              <div key={campaign.id} className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl group hover:border-emerald-500/30 transition-all shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} ${status.color} text-[10px] font-black uppercase tracking-wider`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors">
                    {campaign.name}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {campaign.clients?.name || 'Cliente não identificado'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1a3a24]">
                  <div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Início</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Calendar size={12} className="text-emerald-500/50" />
                      {formatDate(campaign.start_date)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Término</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Calendar size={12} className="text-emerald-500/50" />
                      {formatDate(campaign.end_date)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
