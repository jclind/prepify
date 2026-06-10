import { useSyncExternalStore } from 'react'

/**
 * Tiny localStorage-backed external store for the selected /recipes redesign
 * take. Mirrors the convention used by the desktop-nav redesign so the floating
 * switcher and the Recipes page stay in sync and re-render together.
 *
 * `default` means "render the current production page untouched".
 */
const KEY = 'prepify:recipesTake'
export const DEFAULT_TAKE = 'default'

const listeners = new Set<() => void>()
let cached: string | null | undefined // undefined = not read yet

const read = (): string => {
  if (cached === undefined) {
    cached =
      typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  }
  return cached || DEFAULT_TAKE
}

export const setRecipesTake = (id: string): void => {
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

export const useRecipesTake = (): string =>
  useSyncExternalStore(subscribe, read, () => DEFAULT_TAKE)
