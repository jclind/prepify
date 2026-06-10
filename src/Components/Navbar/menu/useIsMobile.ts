import { useEffect, useState } from 'react'

// Matches the mobile breakpoint where the hamburger menu is used (Navbar.scss).
const MOBILE_QUERY = '(max-width: 725px)'

const hasMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/**
 * True when the viewport is at the mobile nav breakpoint. Used to mount the
 * mobile menu only where it's reachable, so its `SearchRecipesInput` (and the
 * document listener it registers) isn't kept alive on desktop.
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(
    () => hasMatchMedia() && window.matchMedia(MOBILE_QUERY).matches
  )

  useEffect(() => {
    if (!hasMatchMedia()) return
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)
    onChange() // sync in case it changed between render and effect
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
