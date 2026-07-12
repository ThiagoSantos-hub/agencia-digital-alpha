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
  DollarSign,
  ChevronDown
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
    <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E293B]">Financeiro Pessoal</h1>
          <p className="text-[#64748B] text-sm mt-1">Gerencie suas receitas e gastos de forma simples.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-green-50 text-[#16A34A] border border-green-100">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">Total Receitas</p>
          <h3 className="text-2xl font-bold text-[#16A34A] mt-1">
            {loading ? '...' : formatCurrency(totalReceitas)}
          </h3>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-red-50 text-[#EF4444] border border-red-100">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">Total Gastos</p>
          <h3 className="text-2xl font-bold text-[#EF4444] mt-1">
            {loading ? '...' : formatCurrency(totalGastos)}
          </h3>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">Saldo Atual</p>
          <h3 className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-[#1E293B]' : 'text-[#EF4444]'}`}>
            {loading ? '...' : formatCurrency(saldo)}
          </h3>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748B] italic font-medium">Carregando lançamentos...</td>
                </tr>
              ) : finances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748B] italic font-medium">Nenhum lançamento encontrado.</td>
                </tr>
              ) : (
                finances.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-[#1E293B]">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.type === 'receita' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${item.type === 'receita' ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                      {item.type === 'receita' ? '+' : '-'} {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748B] font-medium">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-[#64748B] hover:text-[#EF4444] transition-colors rounded-lg hover:bg-red-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="text-lg font-semibold text-[#1E293B]">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Tipo</label>
                <div className="relative">
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'receita' | 'gasto'})}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none font-medium"
                  >
                    <option value="receita">Receita</option>
                    <option value="gasto">Gasto</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Descrição</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Pagamento Freelance"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Valor</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={14} />
                    <input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Data</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={14} />
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
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
