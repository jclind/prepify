import { useEffect } from 'react'

/**
 * Locks background scroll while `locked` is true. In this app the scroll
 * container is `<body>` (html and #root are `overflow: hidden` — see
 * index.scss), so freezing `body`'s overflow stops the page behind the menu.
 */
export const useBodyScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (!locked) return

    const { body } = document
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = prevOverflow
    }
  }, [locked])
}
