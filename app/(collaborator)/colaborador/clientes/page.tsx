'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Ban, 
  Users,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  Building2
} from 'lucide-react'

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  atrasado:  { label: 'Atrasado',  className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  inativo:   { label: 'Inativo',   className: 'bg-red-50 text-red-700 border-red-200', icon: Ban },
}

export default function ColaboradorClientesPage() {
  const { clients, loading } = useClientes()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'atrasado' | 'inativo'>('todos')

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'todos' || client.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [clients, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const total = clients.length
    const ativos = clients.filter(c => c.status === 'ativo').length
    const pendentes = clients.filter(c => c.status === 'atrasado').length
    return { total, ativos, pendentes }
  }, [clients])

  return (
    <div className="min-h-full text-[#1E293B]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-[#1E293B]">
            <Users className="text-[#1A56DB]" />
            Clientes da Agência
          </h1>
          <p className="text-[#64748B] text-sm">Visualize a base completa de clientes atendidos pela Alpha.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1 font-medium">Total de Clientes</p>
          <p className="text-3xl font-semibold text-[#1E293B]">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1 font-medium">Clientes Ativos</p>
          <p className="text-3xl font-semibold text-[#16A34A]">{stats.ativos}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[#64748B] text-sm mb-1 font-medium">Pendências Financeiras</p>
          <p className="text-3xl font-semibold text-amber-600">{stats.pendentes}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] px-3 py-2 rounded-xl shadow-sm">
          <Filter size={16} className="text-[#64748B]" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent outline-none text-sm text-[#1E293B] font-medium"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="atrasado">Atrasados</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Empresa</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Contato</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="p-4">
                    <div className="h-12 bg-gray-100 rounded-lg w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle size={40} className="text-gray-200" />
                    <p className="text-[#64748B] text-sm">Nenhum cliente encontrado.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => {
                const config = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.inativo
                const StatusIcon = config.icon

                return (
                  <tr key={client.id} className="hover:bg-[#F8FAFC] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1A56DB] font-bold text-xs">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1E293B] text-sm">{client.name}</p>
                          <p className="text-[10px] text-[#94A3B8] font-medium">ID: {client.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[#64748B] text-sm">
                        <Building2 size={14} />
                        {client.company || '--'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#64748B] text-[11px]">
                          <Mail size={12} className="text-[#1A56DB]" />
                          {client.email || '--'}
                        </div>
                        <div className="flex items-center gap-2 text-[#64748B] text-[11px]">
                          <Phone size={12} className="text-[#16A34A]" />
                          {client.phone || '--'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${config.className}`}>
                        <StatusIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex justify-end">
                          <div className="p-2 text-[#94A3B8] group-hover:text-[#1A56DB] transition-colors">
                             <ChevronRight size={18} />
                          </div>
                       </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
