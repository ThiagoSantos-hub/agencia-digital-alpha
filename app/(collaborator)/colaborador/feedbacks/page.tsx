'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  MessageSquare, 
  Bug, 
  Upload, 
  Send, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  Image as ImageIcon,
  X
} from 'lucide-react'

interface Feedback {
  id: string
  tipo: 'sugestao' | 'bug'
  titulo: string
  descricao: string
  created_at: string
}

export default function FeedbacksCollaboratorPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Estados do formulário
  const [tipo, setTipo] = useState<'sugestao' | 'bug'>('sugestao')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { user } = useAuth()
  const supabase = createClient()

  const fetchMeusFeedbacks = async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, tipo, titulo, descricao, created_at')
      .eq('colaborador_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFeedbacks(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMeusFeedbacks()
  }, [user?.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArquivo(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const removeFile = () => {
    setArquivo(null)
    setPreviewUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !titulo || !descricao) return

    setSending(true)
    let anexo_url = null

    try {
      // 1. Upload do arquivo se houver
      if (arquivo) {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${user.id}-${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-anexos')
          .upload(fileName, arquivo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('feedback-anexos')
          .getPublicUrl(fileName)
        
        anexo_url = publicUrl
      }

      // 2. Inserir no banco
      const { error: insertError } = await supabase
        .from('feedbacks')
        .insert([{
          colaborador_id: user.id,
          tipo,
          titulo,
          descricao,
          anexo_url
        }])

      if (insertError) throw insertError

      alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.')
      
      // Limpar formulário
      setTitulo('')
      setDescricao('')
      setArquivo(null)
      setPreviewUrl(null)
      fetchMeusFeedbacks()
    } catch (error: any) {
      console.error(error)
      alert('Erro ao enviar feedback: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[#1E293B] text-3xl font-bold tracking-tight">Central de Feedback</h1>
        <p className="text-[#64748B] text-sm mt-1">Sua opinião é fundamental para melhorarmos a plataforma.</p>
      </div>

      {/* Formulário de Envio */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Tipo */}
          <div className="flex p-1 bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setTipo('sugestao')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tipo === 'sugestao' 
                  ? 'bg-emerald-600 text-[#1E293B] shadow-lg' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <MessageSquare size={16} />
              Sugestão
            </button>
            <button
              type="button"
              onClick={() => setTipo('bug')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tipo === 'bug' 
                  ? 'bg-red-600 text-[#1E293B] shadow-lg' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Bug size={16} />
              Bug / Erro
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Assunto</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={tipo === 'bug' ? "Onde o erro aconteceu?" : "Qual a sua ideia?"}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] rounded-2xl px-5 py-4 text-[#1E293B] text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Descrição Detalhada</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={tipo === 'bug' ? "Descreva o que aconteceu e como podemos reproduzir o erro..." : "Explique como sua sugestão pode ajudar no dia a dia..."}
                rows={5}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] rounded-2xl px-5 py-4 text-[#1E293B] text-sm focus:outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner"
                required
              />
            </div>

            {/* Upload de Anexo */}
            <div>
              <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Anexo (Opcional)</label>
              <div className="relative">
                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-[#0f0f0f] border-2 border-dashed border-[#2a2a2a] rounded-2xl cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                      <p className="text-xs text-gray-500 group-hover:text-gray-400">Clique para enviar um print ou imagem</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-[#2a2a2a] group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        type="button"
                        onClick={removeFile}
                        className="p-2 bg-red-500 text-[#1E293B] rounded-full hover:bg-red-600 transition-all shadow-xl"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className={`w-full py-4 rounded-2xl font-bold text-[#1E293B] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
              tipo === 'bug' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
            }`}
          >
            {sending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            {sending ? 'Enviando...' : 'Enviar Feedback'}
          </button>
        </form>
      </div>

      {/* Meus Feedbacks */}
      <div className="space-y-4">
        <h2 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-[8px]">●</span> Meus Envios Recentes
        </h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <RefreshCw size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-2xl p-10 text-center opacity-50">
            <p className="text-[#64748B] text-sm">Você ainda não enviou nenhum feedback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {feedbacks.map((f) => (
              <div key={f.id} className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow rounded-2xl p-5 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    f.tipo === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {f.tipo === 'bug' ? <Bug size={18} /> : <MessageSquare size={18} />}
                  </div>
                  <div>
                    <h4 className="text-[#1E293B] font-semibold text-sm">{f.titulo}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${f.tipo === 'bug' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {f.tipo === 'bug' ? 'Bug' : 'Sugestão'}
                      </span>
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(f.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-gray-800 group-hover:text-emerald-500/20 transition-all" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
