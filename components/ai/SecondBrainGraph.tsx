'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AREA, type BrainNote, type NoteArea } from '@/lib/ai/alphaPersona'
import { loadNotes, loadRel, saveNotes, areasPresent } from '@/lib/ai/secondBrain'

interface Props {
  flashId?: string | null
  onNotesChange?: (notes: BrainNote[]) => void
}

export function SecondBrainGraph({ flashId, onNotesChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [notes, setNotes] = useState<BrainNote[]>([])
  const [rel, setRel] = useState<[string, string][]>([])
  const rafRef = useRef<number | null>(null)

  const refresh = useCallback(() => {
    const n = loadNotes()
    const r = loadRel()
    setNotes(n)
    setRel(r)
    onNotesChange?.(n)
  }, [onNotesChange])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (flashId) refresh()
  }, [flashId, refresh])

  useEffect(() => {
    const host = hostRef.current
    if (!host || notes.length === 0) return

    const W = 1000
    const H = 420
    const cx = W / 2
    const cy = H / 2
    const rx = 340
    const ry = 150

    const degree: Record<string, number> = {}
    for (const [a, b] of rel) {
      degree[a] = (degree[a] ?? 0) + 1
      degree[b] = (degree[b] ?? 0) + 1
    }

    const positions: Record<string, { x: number; y: number }> = {}
    notes.forEach((n, i) => {
      const t = (i / notes.length) * Math.PI * 2 - Math.PI / 2
      positions[n.id] = {
        x: cx + rx * Math.cos(t),
        y: cy + ry * Math.sin(t),
      }
    })

    const edgesSvg = rel
      .map(([a, b], idx) => {
        const A = positions[a]
        const B = positions[b]
        if (!A || !B) return ''
        const cpx = (A.x + B.x) / 2 * 0.65 + cx * 0.35
        const cpy = (A.y + B.y) / 2 * 0.65 + cy * 0.35
        return `<path class="sb-edge" data-i="${idx}" d="M ${A.x} ${A.y} Q ${cpx} ${cpy} ${B.x} ${B.y}" fill="none" stroke="url(#sbGrad)" stroke-width="1.2" stroke-dasharray="6 8" opacity="0.55"/>`
      })
      .join('')

    const rays = notes
      .map((n) => {
        const p = positions[n.id]
        if (!p) return ''
        const color = AREA[n.area]?.color ?? '#8a90a6'
        return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${color}" stroke-width="0.6" opacity="0.25"/>`
      })
      .join('')

    const nodes = notes
      .map((n) => {
        const p = positions[n.id]
        if (!p) return ''
        const color = AREA[n.area]?.color ?? '#8a90a6'
        const deg = degree[n.id] ?? 1
        const r = 10 + Math.min(deg * 2.2, 12)
        const flash = flashId === n.id ? 'sb-flash' : ''
        return `
          <g class="sb-node ${flash}" data-id="${n.id}" style="cursor:pointer">
            <circle class="sb-ring" cx="${p.x}" cy="${p.y}" r="${r + 6}" fill="none" stroke="${color}" stroke-width="1" opacity="0.35"/>
            <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${color}" opacity="0.9"/>
            <text x="${p.x}" y="${p.y + r + 14}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">${escapeXml(n.title)}</text>
          </g>`
      })
      .join('')

    const legendAreas = areasPresent(notes)
      .map((a) => {
        const info = AREA[a as NoteArea]
        return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:10px;color:#94a3b8"><i style="width:8px;height:8px;border-radius:50%;background:${info.color};display:inline-block"></i>${info.label}</span>`
      })
      .join('')

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4C3ABF"/>
            <stop offset="100%" stop-color="#22d3ee"/>
          </linearGradient>
          <radialGradient id="coreGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#818cf8"/>
            <stop offset="55%" stop-color="#4C3ABF"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        ${rays}
        ${edgesSvg}
        <g filter="url(#glow)">
          <circle class="sb-core" cx="${cx}" cy="${cy}" r="28" fill="url(#coreGrad)"/>
          <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="20">🧠</text>
        </g>
        ${nodes}
      </svg>`

    host.innerHTML = svg

    // Animação dash + sinapses
    const edgeEls = host.querySelectorAll<SVGPathElement>('.sb-edge')
    let t0 = performance.now()
    const pulses = Array.from({ length: Math.min(12, rel.length || 1) }, (_, i) => ({
      edge: i % Math.max(rel.length, 1),
      t: i / 12,
    }))

    const pulseLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const svgEl = host.querySelector('svg')
    svgEl?.appendChild(pulseLayer)

    const tick = (now: number) => {
      const dt = (now - t0) / 1000
      edgeEls.forEach((el, i) => {
        el.style.strokeDashoffset = String(-((dt * 24 + i * 6) % 40))
      })

      // respiração dos anéis
      host.querySelectorAll<SVGCircleElement>('.sb-ring').forEach((el, i) => {
        const s = 1 + Math.sin(dt * 2 + i) * 0.06
        el.setAttribute('transform', `scale(${s})`)
        const cx = el.getAttribute('cx')
        const cy = el.getAttribute('cy')
        if (cx && cy) {
          el.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-Number(cx)} ${-Number(cy)})`)
        }
        el.setAttribute('opacity', String(0.25 + Math.sin(dt * 2 + i) * 0.12))
      })

      const core = host.querySelector<SVGCircleElement>('.sb-core')
      if (core) {
        const s = 1 + Math.sin(dt * 1.5) * 0.05
        core.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`)
      }

      pulseLayer.innerHTML = ''
      pulses.forEach((p) => {
        p.t += 0.008
        if (p.t > 1) {
          p.t = 0
          p.edge = Math.floor(Math.random() * Math.max(rel.length, 1))
        }
        const pair = rel[p.edge]
        if (!pair) return
        const A = positions[pair[0]]
        const B = positions[pair[1]]
        if (!A || !B) return
        const cpx = (A.x + B.x) / 2 * 0.65 + cx * 0.35
        const cpy = (A.y + B.y) / 2 * 0.65 + cy * 0.35
        const t = p.t
        const x = (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * cpx + t * t * B.x
        const y = (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * cpy + t * t * B.y
        const op = Math.sin(t * Math.PI)
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        c.setAttribute('cx', String(x))
        c.setAttribute('cy', String(y))
        c.setAttribute('r', '2.4')
        c.setAttribute('fill', '#e0f2fe')
        c.setAttribute('opacity', String(op))
        c.setAttribute('filter', 'url(#glow)')
        pulseLayer.appendChild(c)
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [notes, rel, flashId])

  const areaCount = areasPresent(notes).length

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-cyan-400/90 uppercase">
            🧠 Second Brain
          </p>
          <p className="text-[10px] text-slate-500">Contexto do diretor · injetado em cada comando</p>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {notes.length} notas · {areaCount} áreas
        </span>
      </div>
      <div
        ref={hostRef}
        className="w-full h-[200px] md:h-[220px] rounded-xl border border-cyan-400/15 bg-slate-950/50 overflow-hidden"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex flex-wrap gap-1">
          {areasPresent(notes).map((a) => (
            <span key={a} className="inline-flex items-center gap-1 text-slate-400">
              <i
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: AREA[a].color }}
              />
              {AREA[a].label}
            </span>
          ))}
        </div>
        <span className="text-emerald-400/90 font-medium">✓ contexto ativo na Alpha</span>
      </div>
    </div>
  )
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
