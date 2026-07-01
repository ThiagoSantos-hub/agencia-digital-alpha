'use client'

import { useAuth } from '@/hooks/useAuth'
import { Users, Megaphone, CheckSquare, TrendingUp } from 'lucide-react'

const cards = [
  {
    label: 'Total de Clientes',
    valor: 0,
    icon: Users,
  },
  {
    label: 'Campanhas Ativas',
    valor: 0,
    icon: Megaphone,
  },
  {
    label: 'Tarefas Pendentes',
    valor: 0,
    icon: CheckSquare,
  },
  {
    label: 'Desempenho Geral',
    valor: '—',
    icon: TrendingUp,
  },
]

export default function DashboardPage() {
  const { profile, role } = useAuth()

  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'
  const nome = profile?.name ?? profile?.email ?? 'Usuário'

  return (
    <div className="space-y-6">

      {/* Boas-vindas */}
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
            <span className="text-[#00ff88] text-lg font-bold">
              {nome.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">
              Olá, {nome}! 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Você está logado como{' '}
              <span className="text-[#00ff88] font-medium">{roleLabel}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">{card.label}</p>
                <div className="w-8 h-8 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
                  <Icon size={16} className="text-[#00ff88]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#00ff88]">{card.valor}</p>
            </div>
          )
        })}
      </div>

      {/* Aviso de módulos em breve */}
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-2">🚀 Módulos em desenvolvimento</h3>
        <p className="text-gray-400 text-sm">
          Os módulos de Clientes, Campanhas e Tarefas estão sendo implementados progressivamente.
          Em breve estarão disponíveis no menu lateral.
        </p>
      </div>

    </div>
  )
}
