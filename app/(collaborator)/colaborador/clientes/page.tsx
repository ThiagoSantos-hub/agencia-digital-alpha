'use client'

import { useState, useMemo } from 'react'
import { useClientes, Client } from '@/hooks/useClientes'
import { Search, Loader2 } from 'lucide-react'

/**
 * Clientes da Agência (visão colaborador)
 * Confidencial — NÃO mostra:
 * - clientes inativos
 * - telefones
 * - status atrasado / dias de atraso
 */
export default function ColaboradorClientesPage() {
  const { clients, loading } = useClientes()
  const [search, setSearch] = useState('')

  // Apenas ativos (atrasados aparecem como ativos, sem badge de atraso)
  const filteredActive = useMemo(() =>
    clients.filter(c =>
      c.status !== 'inativo' &&
      (
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    ), [clients, search])

  const renderTable = (list: Client[]) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-text-main font-bold text-lg">Clientes da Agência</h2>
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted text-[10px] font-bold">{list.length}</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-hover-bg">
              <th className="px-5 py-3 text-text-muted font-medium">CLIENTE / EMPRESA</th>
              <th className="px-5 py-3 text-text-muted font-medium">E-MAIL</th>
              <th className="px-5 py-3 text-text-muted font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-text-disabled">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : list.map((c) => (
              <tr key={c.id} className="hover:bg-hover-bg transition-colors">
                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="text-text-main font-bold text-sm">{c.name}</span>
                    <span className="text-text-muted text-xs">{c.company || '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-text-muted text-xs">{c.email || '—'}</span>
                </td>
                <td className="px-5 py-4">
                  {/* Sempre "Ativo" — colaborador não vê atraso nem inativo */}
                  <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border text-cta bg-cta/10 border-cta/30">
                    Ativo
                  </span>
                </td>
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
        <h1 className="text-text-main text-2xl font-bold">Clientes da Agência</h1>
        <p className="text-text-muted text-sm mt-1">Lista de clientes ativos da agência.</p>
      </div>
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-xl text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-all"
        />
      </div>
      <div className="space-y-12">
        {loading && clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-text-muted text-sm">Carregando base de clientes...</p>
          </div>
        ) : (
          renderTable(filteredActive)
        )}
      </div>
    </div>
  )
}
