import Modal from 'react-modal'
import type { CSSProperties } from 'react'

// Shared react-modal styling for every modal in the app. Each modal used to
// declare its own near-identical `style` object (centering + overlay) inline,
// which had drifted (white vs grey panels, 8px vs 5px radius, 0.5 vs 0.6
// overlay). Centralising it keeps the modals visually consistent and is the one
// place to change modal chrome.

// react-modal hides the rest of the app from screen readers via the registered
// "app element". Doing it once here — in the module every modal imports —
// guarantees all modals are covered. Previously only 3 of 7 modal files set it;
// two of those (the navbar Release Notes and footer Bug Report) render in global
// chrome so the call happened app-wide in practice, but relying on that
// incidental import order was fragile — this makes the coverage explicit.
Modal.setAppElement('#root')

// react-modal only applies its built-in centering when no `className` is passed,
// and every Prepify modal passes one, so the centering must be declared here.
const centeredContent: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  right: 'auto',
  bottom: 'auto',
  marginRight: '-50%',
  transform: 'translate(-50%, -50%)',
}

const overlay: CSSProperties = {
  zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.5)',
}

// "Panel" modals let react-modal paint the box itself (white card + padding +
// rounded corners) — confirmation dialogs and forms whose markup sits directly
// on the content element.
export const panelModalStyles = {
  content: {
    ...centeredContent,
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
  },
  overlay,
}

// "Bare" modals make the content element a transparent passthrough so a
// CSS-styled child card owns the entire visual (its own background, radius,
// shadow, overflow).
export const bareModalStyles = {
  content: {
    ...centeredContent,
    padding: 0,
    border: 'none',
    background: 'transparent',
    overflow: 'visible',
  },
  overlay,
}

// Panel styles with per-modal `content` tweaks merged in — e.g. a width cap on
// the form modals, or flex centering on the review-delete confirm.
export const panelModalStylesWith = (content: CSSProperties) => ({
  content: { ...panelModalStyles.content, ...content },
  overlay,
})
