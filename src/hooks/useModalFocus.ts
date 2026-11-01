import { RefObject, useEffect, useRef } from 'react'
import { useBodyScrollLock } from './useBodyScrollLock'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal behavior for an overlay panel while `open` is true: background scroll
 * lock, focus moved into the panel and restored on close, Esc-to-close, and a
 * Tab trap that keeps focus inside the panel. The panel needs `tabIndex={-1}`
 * so it can take focus itself.
 */
export const useModalFocus = (
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void => {
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useBodyScrollLock(open)

  // Focus move-in / restore — keyed only on `open` so an unstable `onClose`
  // identity can't re-capture the restore target or steal focus mid-session.
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    // focus the panel itself (not its first input) to avoid popping the
    // mobile keyboard the moment it opens
    panelRef.current?.focus()
    return () => restoreFocusRef.current?.focus?.()
  }, [open, panelRef])

  // Esc-to-close + Tab focus trap within the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, panelRef])
}
