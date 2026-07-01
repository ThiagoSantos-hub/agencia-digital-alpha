'use client'

import { useState } from 'react'
import { useClientes } from '@/hooks/useClientes'
import { Search, Users } from 'lucide-react'

const statusConfig = {
  ativo: { label: 'Ativo', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  inativo: { label: 'Inativo', className: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  prospecto: { label: 'Prospecto', className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
}

export default function ClientesPage() {
  const { clients, loading, error } = useClientes()
  const [search, setSearch] = useState('')

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Clientes</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Carregando clientes...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 text-sm">Erro ao carregar clientes: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {clients.length === 0
                ? 'Nenhum cliente cadastrado ainda.'
                : 'Nenhum cliente encontrado com essa busca.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-5 py-3 text-gray-500 font-medium">Nome</th>
                <th className="px-5 py-3 text-gray-500 font-medium">E-mail</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Telefone</th>
                <th className="px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const statusInfo = statusConfig[client.status]
                return (
                  <tr
                    key={client.id}
                    className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-white font-medium">{client.name}</td>
                    <td className="px-5 py-3.5 text-gray-400">{client.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400">{client.phone ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
