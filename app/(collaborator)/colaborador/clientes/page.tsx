'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { Search, Loader2, Clock } from 'lucide-react'

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/30'      },
  inativo:   { label: 'Inativo',   className: 'text-gray-400 bg-gray-500/10 border-gray-500/30'         },
}

export default function ColaboradorClientesPage() {
  const { clients, loading } = useClientes()
  const [search, setSearch] = useState('')

  const filteredActive = useMemo(() => 
    clients.filter(c => 
      c.status !== 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
       (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [clients, search])

  const filteredInactive = useMemo(() => 
    clients.filter(c => 
      c.status === 'inativo' && 
      (c.name.toLowerCase().includes(search.toLowerCase()) || 
       (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
       (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    ), [clients, search])

  const renderTable = (list: Client[], title: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-[#1E293B] font-semibold text-lg">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow text-gray-500 text-[10px] font-bold">
          {list.length}
        </span>
      </div>
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#1f1f1f]/50">
                <th className="px-5 py-3 text-gray-500 font-medium">CLIENTE / EMPRESA</th>
                <th className="px-5 py-3 text-gray-500 font-medium">CONTATO</th>
                <th className="px-5 py-3 text-gray-500 font-medium">STATUS</th>
                {title.includes('Inativos') && <th className="px-5 py-3 text-gray-500 font-medium">INATIVADO EM</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]/50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={title.includes('Inativos') ? 4 : 3} className="px-5 py-10 text-center text-gray-600">
                    Nenhum cliente encontrado nesta seção.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#1E293B] font-semibold text-sm">{c.name}</span>
                        <span className="text-gray-500 text-xs">{c.company || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-xs flex items-center gap-1.5">
                          {c.phone || '—'}
                        </span>
                        <span className="text-gray-600 text-[10px]">{c.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>
                          {statusConfig[c.status].label}
                        </span>
                        {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                          <span className="text-amber-500 text-[10px] font-bold flex items-center gap-1">
                            <Clock size={10} /> {c.dias_atraso} dias
                          </span>
                        )}
                      </div>
                    </td>
                    {title.includes('Inativos') && (
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {c.inativo_em ? new Date(c.inativo_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#1E293B] text-2xl font-bold">Clientes</h1>
          <p className="text-[#64748B] text-sm mt-1">Visualize a lista de clientes da agência e seus status.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Buscar por nome, empresa ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-2xl text-[#1E293B] placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
      </div>

      <div className="space-y-12">
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="text-[#64748B] text-sm">Carregando base de clientes...</p>
          </div>
        ) : (
          <>
            {renderTable(filteredActive, 'Clientes Ativos e Atrasados')}
            {renderTable(filteredInactive, 'Clientes Inativos')}
          </>
        )}
      </div>
    </div>
  )
}
