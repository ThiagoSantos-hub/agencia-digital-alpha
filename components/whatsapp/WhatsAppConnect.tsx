'use client'

import { useState, useEffect, useCallback } from 'react'
import { Smartphone, RefreshCw, Loader2, Users } from 'lucide-react'

interface WhatsAppStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error'
  qrcode?: string | null
  instance_name?: string
  error?: string
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

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance')
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', error: data.error })
        return
      }
      setState({ status: data.status, qrcode: data.qrcode, instance_name: data.instance_name })
      return data.status
    } catch {
      setState({ status: 'error', error: 'Erro de rede' })
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const res = await fetch('/api/whatsapp/groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } finally {
      setLoadingGroups(false)
    }
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
          fetchGroups()
        }
      }, 4000)
      setPollingInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [state.status])

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
    setShowQR(false)
    await fetchStatus()
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-3 py-3">
        <Loader2 size={18} className="animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Verificando WhatsApp...</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a0a', border: '1px solid #3a1a1a' }}>
        <p className="text-sm text-red-400 font-medium mb-1">⚠️ WhatsApp indisponível</p>
        <p className="text-xs text-red-300/70">{state.error}</p>
        <button
          onClick={handleConnect}
          className="mt-3 text-xs px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#2a1a1a', color: '#ff6666', border: '1px solid #3a1a1a' }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (state.status === 'connected') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#0a1f0f', border: '1px solid #1a3a24' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ backgroundColor: '#0a0f0c' }}>
                <span className="text-xl">💬</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">WhatsApp Conectado</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                  <p className="text-xs" style={{ color: '#00ff88' }}>Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchGroups}
                disabled={loadingGroups}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ backgroundColor: '#0a1f14', color: '#00ff88', border: '1px solid #1a3a24' }}
                title="Atualizar grupos"
              >
                <RefreshCw size={12} className={loadingGroups ? 'animate-spin' : ''} />
                Atualizar
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: '#1a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}
              >
                {disconnecting ? '...' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>

        {showGroupsButton && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#0f1320', border: '1px solid #1a2040' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-indigo-400" />
                <p className="text-sm font-medium text-white">
                  Grupos disponíveis
                  {groups.length > 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#1a2040', color: '#818cf8' }}>
                      {groups.length}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGroups(!showGroups)
                  if (!showGroups) fetchGroups()
                }}
                disabled={loadingGroups}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ backgroundColor: '#1a2040', color: '#818cf8', border: '1px solid #2a3060' }}
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
                    <Loader2 size={14} className="animate-spin text-gray-500" />
                    <span className="text-xs text-gray-500">Carregando grupos...</span>
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    Nenhum grupo encontrado. Verifique se seu WhatsApp está em algum grupo.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {groups.map(g => (
                      <div key={g.group_id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#0a0f1a' }}>
                        <span className="text-sm text-white truncate">{g.name}</span>
                        {g.participant_count > 0 && (
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{g.participant_count} membros</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-3" style={{ color: '#4a5a7a' }}>
                  Esses grupos aparecem automaticamente ao criar um relatório do tipo "Grupo".
                </p>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 text-center" style={{ backgroundColor: '#0f1320', border: '1px solid #1a2040' }}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <Smartphone size={18} className="text-indigo-400" />
        <p className="text-white text-sm font-semibold">Conectar WhatsApp</p>
      </div>

      {showQR && state.qrcode ? (
        <>
          <div className="bg-white rounded-xl p-3 inline-block mb-4 shadow-lg">
            <img
              src={state.qrcode.startsWith('data:') ? state.qrcode : `data:image/png;base64,${state.qrcode}`}
              alt="QR Code WhatsApp"
              className="w-48 h-48 object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 size={13} className="animate-spin text-indigo-400" />
            <p className="text-xs text-indigo-300">Aguardando leitura do QR Code...</p>
          </div>
          <ol className="text-xs text-left space-y-1 mt-4 px-2" style={{ color: '#6b7280' }}>
            <li>1. Abra o WhatsApp no celular</li>
            <li>2. Toque em <strong className="text-gray-300">Dispositivos conectados</strong></li>
            <li>3. Toque em <strong className="text-gray-300">Conectar um dispositivo</strong></li>
            <li>4. Aponte a câmera para o QR Code acima</li>
          </ol>
          <button
            onClick={fetchStatus}
            className="mt-4 text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 mx-auto"
            style={{ backgroundColor: '#1a2040', color: '#818cf8', border: '1px solid #2a3060' }}
          >
            <RefreshCw size={12} /> Atualizar QR Code
          </button>
        </>
      ) : (
        <div className="py-6">
          <button
            onClick={() => {
              setShowQR(true)
              handleConnect()
            }}
            className="text-sm px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#25D366', color: '#fff' }}
          >
            📱 Conectar WhatsApp
          </button>
          <p className="text-xs mt-3" style={{ color: '#4a5a7a' }}>
            Seu WhatsApp será vinculado a esta conta
          </p>
        </div>
      )}
    </div>
  )
}
