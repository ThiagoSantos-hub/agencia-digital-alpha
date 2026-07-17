'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { Search, Loader2, Clock } from 'lucide-react'

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-cta bg-cta/10 border-cta/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
  inativo:   { label: 'Inativo',   className: 'text-text-muted bg-slate-100 border-slate-200' },
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
        <h2 className="text-text-main font-bold text-lg">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted text-[10px] font-bold">{list.length}</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-hover-bg">
              <th className="px-5 py-3 text-text-muted font-medium">CLIENTE / EMPRESA</th>
              <th className="px-5 py-3 text-text-muted font-medium">CONTATO</th>
              <th className="px-5 py-3 text-text-muted font-medium">STATUS</th>
              {title.includes('Inativos') && <th className="px-5 py-3 text-text-muted font-medium">INATIVADO EM</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr><td colSpan={title.includes('Inativos') ? 4 : 3} className="px-5 py-10 text-center text-text-disabled">Nenhum cliente encontrado nesta seção.</td></tr>
            ) : list.map((c) => (
              <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="text-text-main font-bold text-sm">{c.name}</span>
                    <span className="text-text-muted text-xs">{c.company || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-muted text-xs">{c.phone || '—'}</span>
                    <span className="text-text-disabled text-[10px]">{c.email || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>{statusConfig[c.status].label}</span>
                    {(c.status === 'atrasado') && ((c.dias_atraso ?? 0) > 0) && (
                      <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1"><Clock size={10} /> {c.dias_atraso} dias</span>
                    )}
                  </div>
                </td>
                {title.includes('Inativos') && (
                  <td className="px-5 py-4 text-text-muted text-xs">{c.inativo_em ? new Date(c.inativo_em).toLocaleDateString('pt-BR') : '—'}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-8 space-y-8 pb-20">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Clientes</h1>
        <p className="text-text-muted text-sm mt-1">Visualize a lista de clientes da agência e seus status.</p>
      </div>
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="Buscar por nome, empresa ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-all" />
      </div>
      <div className="space-y-12">
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-text-muted text-sm">Carregando base de clientes...</p>
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
