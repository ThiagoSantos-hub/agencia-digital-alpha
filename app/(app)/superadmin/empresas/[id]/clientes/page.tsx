'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Target } from 'lucide-react'

interface ClienteResumo {
  id: string
  name: string
  company: string | null
  status: 'ativo' | 'atrasado' | 'inativo'
  meta_ad_account_id: string | null
}

const statusConfig = {
  ativo:     { label: 'Ativo',     className: 'text-cta bg-cta/10 border-cta/30' },
  atrasado:  { label: 'Atrasado',  className: 'text-amber-700 bg-amber-50 border-amber-200' },
  inativo:   { label: 'Inativo',   className: 'text-text-muted bg-slate-100 border-slate-200' },
}

export default function EmpresaClientesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [clients, setClients] = useState<ClienteResumo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/superadmin/companies/${id}/clients`)
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/superadmin/empresas')} className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-text-main text-lg font-bold">Clientes da Empresa</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-text-muted" /></div>
      ) : clients.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-muted text-sm">
          Essa empresa ainda não tem clientes cadastrados.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-hover-bg">
                <th className="px-3 py-2 text-text-muted font-medium text-[11px]">CLIENTE</th>
                <th className="px-3 py-2 text-text-muted font-medium text-[11px]">STATUS</th>
                <th className="px-3 py-2 text-text-muted font-medium text-[11px]">META ADS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/superadmin/empresas/${id}/clientes/${c.id}`)}
                  className="hover:bg-hover-bg transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-text-main font-bold text-xs">{c.name}</span>
                    <span className="text-text-muted text-[10px] ml-1.5">{c.company || '—'}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig[c.status].className}`}>{statusConfig[c.status].label}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {c.meta_ad_account_id ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600"><Target size={12} /> Configurado</span>
                    ) : (
                      <span className="text-text-disabled text-xs">Não configurado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
