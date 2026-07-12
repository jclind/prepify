import { useEffect, useState } from 'react'

// This app makes <body> the scroll container (index.scss: html is
// overflow:hidden and body's overflow-x:hidden promotes overflow-y to auto), so
// window.scrollY stays 0. Read whichever element actually holds the offset.
const getScrollTop = (): number => {
  if (typeof window === 'undefined') return 0
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

/**
 * True once the page has scrolled past `threshold` px. Drives the scroll-aware
 * desktop bar (transparent over the Home hero → solid/frosted once scrolled).
 * The listener uses the capture phase so it also catches scrolling on the
 * <body> container (scroll events don't bubble). SSR-safe, like `useIsMobile`.
 */
export const useScrolled = (threshold = 10): boolean => {
  const [scrolled, setScrolled] = useState(() => getScrollTop() > threshold)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => setScrolled(getScrollTop() > threshold)
    onScroll() // sync in case it changed between render and effect
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () =>
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
  }, [threshold])

  return scrolled
}
