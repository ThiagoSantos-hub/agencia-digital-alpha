'use client'

import { useState, useEffect, useCallback } from 'react'
import { Smartphone, RefreshCw, Loader2, Users, Check, X } from 'lucide-react'

interface WhatsAppStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error'
  qrcode?: string | null
  instance_name?: string
  error?: string
  grupos_visiveis_colaboradores?: boolean
}

interface WhatsAppGroup {
  group_id: string
  name: string
  participant_count: number
}

interface WhatsAppConnectProps {
  compact?: boolean
  showGroupsButton?: boolean
}

export function WhatsAppConnect({ compact = false, showGroupsButton = false }: WhatsAppConnectProps) {
  const [state, setState] = useState<WhatsAppStatus>({ status: 'loading' })
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showGroups, setShowGroups] = useState(false)
  const [gruposVisiveis, setGruposVisiveis] = useState(false)
  const [savingGruposVisiveis, setSavingGruposVisiveis] = useState(false)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', error: data.error })
        return
      }
      setState({
        status: data.status,
        qrcode: data.qrcode,
        instance_name: data.instance_name,
        grupos_visiveis_colaboradores: data.grupos_visiveis_colaboradores,
      })
      // Restaura toggle salvo no banco
      if (typeof data.grupos_visiveis_colaboradores === 'boolean') {
        setGruposVisiveis(data.grupos_visiveis_colaboradores)
      }
      return data.status
    } catch {
      setState({ status: 'error', error: 'Erro de rede' })
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      // force=1 garante sync fresco com a Evolution API
      const res = await fetch('/api/whatsapp/groups?force=1', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setGroups(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  const hideGroup = useCallback(async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.group_id !== groupId))
    await fetch(`/api/whatsapp/groups?group_id=${encodeURIComponent(groupId)}`, { method: 'DELETE' })
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (state.status === 'connecting') {
      const interval = setInterval(async () => {
        const newStatus = await fetchStatus()
        if (newStatus === 'connected') {
          clearInterval(interval)
          setTimeout(fetchGroups, 1000)
        }
      }, 2000)
      setPollingInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [state.status])

  const handleToggleGruposVisiveis = useCallback(async (enabled: boolean) => {
    setSavingGruposVisiveis(true)
    // Optimistic UI
    setGruposVisiveis(enabled)
    try {
      const res = await fetch('/api/whatsapp/instance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupos_visiveis_colaboradores: enabled }),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.grupos_visiveis_colaboradores === 'boolean') {
          setGruposVisiveis(data.grupos_visiveis_colaboradores)
        }
        setShowSavedFeedback(true)
        setTimeout(() => setShowSavedFeedback(false), 2000)
      } else {
        // Reverte se falhou
        setGruposVisiveis(!enabled)
      }
    } catch {
      setGruposVisiveis(!enabled)
    } finally {
      setSavingGruposVisiveis(false)
    }
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/whatsapp/instance', { method: 'DELETE' })
      setState({ status: 'disconnected' })
      setGroups([])
      setShowQR(false)
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleConnect() {
    setState({ status: 'loading' })
    setShowQR(true)
    setState(prev => ({ ...prev, qrcode: null, error: undefined }))
    await fetchStatus()
  }

  if (state.status === 'loading' && !showQR) {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 size={18} className="animate-spin text-text-muted" />
        <span className="text-sm text-text-muted">Verificando WhatsApp...</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-xl p-4 bg-red-50 border border-red-200">
        <p className="text-sm text-red-600 font-medium mb-1">⚠️ WhatsApp indisponível</p>
        <p className="text-xs text-red-500/80">{state.error}</p>
        <button
          onClick={handleConnect}
          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (state.status === 'connected') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl p-4 bg-surface border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-cta/10 border border-cta/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/whatsapp.svg" alt="WhatsApp" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-text-main text-sm font-medium">WhatsApp Conectado</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-cta inline-block animate-pulse" />
                  <p className="text-xs text-cta font-medium">Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchGroups}
                disabled={loadingGroups}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                title="Atualizar grupos"
              >
                <RefreshCw size={12} className={loadingGroups ? 'animate-spin' : ''} />
                Atualizar
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
              >
                {disconnecting ? '...' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-surface border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-main text-sm font-medium">Permitir que colaboradores vejam meus grupos</p>
              <p className="text-xs text-text-muted">Se ativo, os colaboradores poderão visualizar os grupos do seu WhatsApp</p>
            </div>
            <button
              onClick={() => handleToggleGruposVisiveis(!gruposVisiveis)}
              disabled={savingGruposVisiveis}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                gruposVisiveis ? 'bg-cta' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 transform ${
                  gruposVisiveis ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {showSavedFeedback && (
            <div className="flex items-center gap-1.5 mt-2">
              <Check size={12} className="text-cta" />
              <span className="text-xs text-cta font-medium">Salvo!</span>
            </div>
          )}
        </div>

        {showGroupsButton && (
          <div className="rounded-xl p-4 bg-surface border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-primary" />
                <p className="text-sm font-medium text-text-main">
                  Grupos disponíveis
                  {groups.length > 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {groups.length}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !showGroups
                  setShowGroups(next)
                  if (next) fetchGroups()
                }}
                disabled={loadingGroups}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {loadingGroups ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  showGroups ? 'Ocultar' : 'Ver Grupos da Agência'
                )}
              </button>
            </div>
            
            {showGroups && (
              <>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 size={14} className="animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Sincronizando grupos...</span>
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-xs text-text-muted py-2">
                    Nenhum grupo encontrado. Clique em Atualizar ou verifique se o WhatsApp está em grupos.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {groups.map(g => (
                      <div key={g.group_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-hover-bg border border-border">
                        <span className="text-sm text-text-main truncate">{g.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {g.participant_count > 0 && (
                            <span className="text-xs text-text-muted">{g.participant_count} membros</span>
                          )}
                          <button
                            type="button"
                            onClick={() => hideGroup(g.group_id)}
                            title="Esse grupo não existe mais / já saí dele"
                            className="p-1 rounded-md text-text-disabled hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-3 text-text-disabled">
                  Esses grupos aparecem automaticamente ao criar um relatório do tipo "Grupo". Se algum não existir mais, clica no "x" pra escondê-lo.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 text-center bg-surface border border-border shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Smartphone size={18} className="text-primary" />
        <p className="text-text-main text-sm font-semibold">Conectar WhatsApp</p>
      </div>

      {showQR && state.qrcode ? (
        <>
          <div className="bg-white rounded-xl p-3 inline-block mb-4 shadow-lg border border-border">
            <img
              src={state.qrcode.startsWith('data:') ? state.qrcode : `data:image/png;base64,${state.qrcode}`}
              alt="QR Code WhatsApp"
              className="w-48 h-48 object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 size={13} className="animate-spin text-primary" />
            <p className="text-xs text-primary">Aguardando leitura do QR Code...</p>
          </div>
          <ol className="text-xs text-left space-y-1 mt-4 px-2 text-text-muted">
            <li>1. Abra o WhatsApp no celular</li>
            <li>2. Toque em <strong className="text-text-main">Dispositivos conectados</strong></li>
            <li>3. Toque em <strong className="text-text-main">Conectar um dispositivo</strong></li>
            <li>4. Aponte a câmera para o QR Code acima</li>
          </ol>
          <button
            onClick={fetchStatus}
            className="mt-4 text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 mx-auto bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <RefreshCw size={12} /> Atualizar QR Code
          </button>
        </>
      ) : (
        <div className="py-6">
          <button
            onClick={handleConnect}
            className="text-sm px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 flex items-center gap-2 mx-auto bg-[#25D366] text-white shadow-sm"
          >
            {state.status === 'loading' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logos/whatsapp.svg" alt="" className="w-[18px] h-[18px] brightness-0 invert" />
            )}{' '}
            Conectar WhatsApp
          </button>
          <p className="text-xs mt-3 text-text-disabled">
            Seu WhatsApp será vinculado a esta conta
          </p>
        </div>
      )}
    </div>
  )
}
