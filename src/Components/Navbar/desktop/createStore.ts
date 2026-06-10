import { useSyncExternalStore } from 'react'

/** How prominently the "Create Recipe" action is shown in the bar. */
export type CreateStyle = 'promoted' | 'balanced'

export const CREATE_STYLES: { id: CreateStyle; label: string }[] = [
  { id: 'promoted', label: 'Promoted button' }, // filled accent button
  { id: 'balanced', label: 'Balanced link' }, // lighter ghost/outline
]

const DEFAULT: CreateStyle = 'promoted'
const KEY = 'prepify:desktopNavCreate'
const listeners = new Set<() => void>()
let cached: string | null | undefined

const normalize = (v: string | null | undefined): CreateStyle =>
  v === 'balanced' ? 'balanced' : 'promoted'

const read = (): CreateStyle => {
  if (cached === undefined) {
    cached =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  }
  return normalize(cached)
}

export const setDesktopCreateStyle = (id: CreateStyle): void => {
  cached = id
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, id)
  listeners.forEach(l => l())
}

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const useDesktopCreateStyle = (): CreateStyle =>
  useSyncExternalStore(subscribe, read, () => DEFAULT)
