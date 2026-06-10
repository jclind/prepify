import { useSyncExternalStore } from 'react'
import { DEFAULT_VARIANT_ID, getVariant } from './registry'

/**
 * Tiny external store for the currently-selected desktop nav variant, persisted
 * in localStorage. Lets the dev switcher and the Navbar (siblings) stay in sync
 * and re-render together when the selection changes.
 */
const KEY = 'prepify:desktopNavVariant'
const listeners = new Set<() => void>()
let cached: string | null | undefined // undefined = not yet read from storage

const read = (): string => {
  if (cached === undefined) {
    cached =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  }
  return getVariant(cached).id
}

export const setDesktopVariant = (id: string): void => {
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

/** Reactive read of the selected variant id (validated against the registry). */
export const useDesktopVariant = (): string =>
  useSyncExternalStore(subscribe, read, () => DEFAULT_VARIANT_ID)
