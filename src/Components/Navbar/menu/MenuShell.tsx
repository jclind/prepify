import React, { FC, ReactNode, useEffect } from 'react'
import { useBodyScrollLock } from './useBodyScrollLock'

type MenuShellProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Scaffold for the mobile nav menu: a full-screen overlay with Esc-to-close and
 * a body-scroll lock. The panel itself is styled in NavMenu.scss; the bar (logo
 * + hamburger/X) stays above it so it remains tappable to close.
 */
const MenuShell: FC<MenuShellProps> = ({ open, onClose, children }) => {
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`nav-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div
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
