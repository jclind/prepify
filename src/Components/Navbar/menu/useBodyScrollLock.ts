import { useEffect } from 'react'

/** Locks `body` scroll (and preserves the scrollbar gutter) while `locked` is true. */
export const useBodyScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (!locked) return

    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [locked])
}
