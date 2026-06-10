import { useSyncExternalStore } from 'react'

/**
 * Dev-only override to preview the bar's signed-in vs signed-out design without
 * actually logging in. 'auto' = use real auth. Only honored in dev (see
 * DesktopBar); the switcher that sets it never renders in prod.
 */
export type AuthPreview = 'auto' | 'in' | 'out'

export const AUTH_PREVIEWS: { id: AuthPreview; label: string }[] = [
  { id: 'auto', label: 'Auto (real auth)' },
  { id: 'in', label: 'Signed in' },
  { id: 'out', label: 'Signed out' },
]

const DEFAULT: AuthPreview = 'auto'
const KEY = 'prepify:desktopNavAuth'
const listeners = new Set<() => void>()
let cached: string | null | undefined

const normalize = (v: string | null | undefined): AuthPreview =>
  v === 'in' || v === 'out' ? v : 'auto'

const read = (): AuthPreview => {
  if (cached === undefined) {
    cached =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  }
  return normalize(cached)
}

export const setAuthPreview = (id: AuthPreview): void => {
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

export const useAuthPreview = (): AuthPreview =>
  useSyncExternalStore(subscribe, read, () => DEFAULT)
