// lib/ai/secondBrain.ts — persistência local do Second Brain
'use client'

import {
  DEFAULT_NOTES,
  DEFAULT_REL,
  type BrainNote,
  type NoteArea,
  AREA,
} from './alphaPersona'

const NOTES_KEY = 'alpha_second_brain_notes'
const REL_KEY = 'alpha_second_brain_rel'

export function loadNotes(): BrainNote[] {
  if (typeof window === 'undefined') return DEFAULT_NOTES
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(DEFAULT_NOTES))
      return DEFAULT_NOTES
    }
    const parsed = JSON.parse(raw) as BrainNote[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NOTES
  } catch {
    return DEFAULT_NOTES
  }
}

export function saveNotes(notes: BrainNote[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  } catch {
    /* ignore */
  }
}

export function loadRel(): [string, string][] {
  if (typeof window === 'undefined') return DEFAULT_REL
  try {
    const raw = localStorage.getItem(REL_KEY)
    if (!raw) {
      localStorage.setItem(REL_KEY, JSON.stringify(DEFAULT_REL))
      return DEFAULT_REL
    }
    const parsed = JSON.parse(raw) as [string, string][]
    return Array.isArray(parsed) ? parsed : DEFAULT_REL
  } catch {
    return DEFAULT_REL
  }
}

const SAVE_RE = /\[\[SAVE:([a-z_]+)\|([^|]+)\|([\s\S]+?)\]\]/gi

export function stripAndApplySaves(text: string): {
  clean: string
  notes: BrainNote[]
  changed: boolean
} {
  let notes = loadNotes()
  let changed = false
  let clean = text

  const matches = [...text.matchAll(SAVE_RE)]
  for (const m of matches) {
    const area = m[1] as NoteArea
    const title = m[2].trim()
    const body = m[3].trim()
    if (!AREA[area]) continue

    const existing = notes.find(
      (n) => n.title.toLowerCase() === title.toLowerCase() && n.area === area
    )
    if (existing) {
      notes = notes.map((n) =>
        n.id === existing.id ? { ...n, body } : n
      )
    } else {
      notes = [
        ...notes,
        {
          id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          area,
          title,
          body,
        },
      ]
    }
    changed = true
    clean = clean.replace(m[0], '').trim()
  }

  if (changed) saveNotes(notes)
  return { clean, notes, changed }
}

export function areasPresent(notes: BrainNote[]): NoteArea[] {
  return [...new Set(notes.map((n) => n.area))]
}
