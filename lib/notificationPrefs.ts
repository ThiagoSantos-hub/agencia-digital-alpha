/** Preferências locais de notificação (pop-up do dia + permissão do navegador) */

const POPUP_MUTE_KEY = 'alpha_popup_mute_date'
const PERM_ASKED_KEY = 'alpha_notif_perm_asked'

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** true se o usuário desativou pop-ups para o dia de hoje */
export function isPopupMutedToday(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(POPUP_MUTE_KEY) === todayKey()
  } catch {
    return false
  }
}

/** Desativa pop-ups até o fim do dia (amanhã volta ao normal) */
export function mutePopupsForToday(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(POPUP_MUTE_KEY, todayKey())
  } catch {
    /* ignore */
  }
}

export function unmutePopups(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(POPUP_MUTE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasAskedNotificationPermission(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(PERM_ASKED_KEY) === '1'
  } catch {
    return true
  }
}

export function markNotificationPermissionAsked(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PERM_ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Toca campainha curta (Web Audio — sem arquivo externo) */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime

    const beep = (freq: number, start: number, dur: number, gain = 0.12) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(gain, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }

    // Dois toques de campainha
    beep(880, now, 0.18, 0.14)
    beep(1174, now + 0.16, 0.22, 0.11)

    setTimeout(() => {
      ctx.close().catch(() => {})
    }, 800)
  } catch {
    /* ignore */
  }
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `alpha-${Date.now()}`,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* ignore */
  }
}
