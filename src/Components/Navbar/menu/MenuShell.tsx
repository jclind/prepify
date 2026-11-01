import React, { FC, ReactNode, useRef } from 'react'
import { useModalFocus } from 'src/hooks/useModalFocus'

type MenuShellProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Scaffold for the mobile nav menu: a full-screen overlay with Esc-to-close, a
 * body-scroll lock, and modal focus handling (focus moves into the panel on
 * open, is trapped within it, and is restored on close). The bar (logo +
 * hamburger/X) stays above it so it remains tappable to close.
 */
const MenuShell: FC<MenuShellProps> = ({ open, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useModalFocus(open, panelRef, onClose)

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
