'use client'

import { useState } from 'react'
import { useColaboradorFinance } from '@/hooks/useColaboradorFinance'
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  X,
  Calendar as CalendarIcon,
  DollarSign
} from 'lucide-react'

export default function FinanceiroPage() {
  const { 
    finances, 
    loading, 
    createFinance, 
    deleteFinance, 
    totalReceitas, 
    totalGastos, 
    saldo 
  } = useColaboradorFinance()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'receita' as 'receita' | 'gasto',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount || !formData.date) return

    setIsSubmitting(true)
    const { error } = await createFinance({
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date
    })

    if (!error) {
      setIsModalOpen(false)
      setFormData({
        type: 'receita',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      })
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      await deleteFinance(id)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Financeiro Pessoal</h1>
          <p className="text-text-muted text-sm mt-1">Gerencie suas receitas e gastos de forma simples.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-text-muted text-sm font-medium">Total Receitas</p>
          <h3 className="text-2xl font-bold text-emerald-400 mt-1">
            {loading ? '...' : formatCurrency(totalReceitas)}
          </h3>
        </div>

        <div className="bg-background border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-red-400/10 text-red-400">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-text-muted text-sm font-medium">Total Gastos</p>
          <h3 className="text-2xl font-bold text-red-400 mt-1">
            {loading ? '...' : formatCurrency(totalGastos)}
          </h3>
        </div>

        <div className="bg-background border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-blue-400/10 text-blue-400">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-text-muted text-sm font-medium">Saldo Atual</p>
          <h3 className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-text-main' : 'text-red-400'}`}>
            {loading ? '...' : formatCurrency(saldo)}
          </h3>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-hover-bg">
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a3a24]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted italic">Carregando lançamentos...</td>
                </tr>
              ) : finances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted italic">Nenhum lançamento encontrado.</td>
                </tr>
              ) : (
                finances.map((item) => (
                  <tr key={item.id} className="hover:bg-hover-bg/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-text-main">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'receita' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${item.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.type === 'receita' ? '+' : '-'} {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Tipo</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'receita' | 'gasto'})}
                  className="w-full bg-hover-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  <option value="receita">Receita</option>
                  <option value="gasto">Gasto</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Descrição</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Pagamento Freelance"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-hover-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Valor</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-hover-bg border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Data</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-hover-bg border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-border text-text-muted font-bold rounded-xl hover:bg-hover-bg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
