import { useSyncExternalStore } from 'react'
import { DEFAULT_DROPDOWN_ID, getDropdown } from './dropdownRegistry'

/**
 * External store for the selected account-dropdown design (persisted in
 * localStorage). Mirrors `variantStore`, but for the dropdown dimension so the
 * dev switcher and the account menu stay in sync.
 */
const KEY = 'prepify:desktopNavDropdown'
const listeners = new Set<() => void>()
let cached: string | null | undefined

const read = (): string => {
  if (cached === undefined) {
    cached =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  }
  return getDropdown(cached).id
}

export const setDesktopDropdown = (id: string): void => {
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

export const useDesktopDropdown = (): string =>
  useSyncExternalStore(subscribe, read, () => DEFAULT_DROPDOWN_ID)
