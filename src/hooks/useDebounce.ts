import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after `ms` have passed
 * with no further changes. Used to drive search requests off keystrokes without
 * firing one per character.
 */
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
