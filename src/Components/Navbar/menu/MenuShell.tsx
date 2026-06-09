import React, { FC, ReactNode, useEffect, useRef } from 'react'
import { useBodyScrollLock } from './useBodyScrollLock'

type MenuShellProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Scaffold for the mobile nav menu: a full-screen overlay with Esc-to-close, a
 * body-scroll lock, and modal focus handling (focus moves into the panel on
 * open, is trapped within it, and is restored on close). The bar (logo +
 * hamburger/X) stays above it so it remains tappable to close.
 */
const MenuShell: FC<MenuShellProps> = ({ open, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useBodyScrollLock(open)

  // Focus move-in / restore — keyed only on `open` so an unstable `onClose`
  // identity can't re-capture the restore target or steal focus mid-session.
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    // focus the panel itself (not the search input) to avoid popping the
    // mobile keyboard the moment the menu opens
    panelRef.current?.focus()
    return () => restoreFocusRef.current?.focus?.()
  }, [open])

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
  }, [open, onClose])

  return (
    <div className={`nav-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className='nav-menu__panel'
        role='dialog'
        aria-modal='true'
        aria-label='Navigation menu'
      >
        {children}
      </div>
    </div>
  )
}

export default MenuShell
