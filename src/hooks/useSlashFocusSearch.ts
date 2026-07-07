import { useEffect } from 'react'

// An element is "typing context" if a bare `/` should be inserted as text rather
// than treated as the search hotkey — inputs, textareas, selects, and any
// contenteditable surface (rich-text editors, etc.).
function isTypingContext(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

// Whether an element can actually receive focus right now. Several
// `.search-recipes-input` instances can be in the DOM at once but hidden by an
// *ancestor* rather than themselves — the desktop nav search sits in a
// `display:none .dnav__search` on the Home hero, and the closed mobile menu is a
// `visibility:hidden` subtree — and neither can take focus. So walk the ancestor
// chain, not just the element's own style. `getComputedStyle` (rather than
// `offsetParent`/`getClientRects`) keeps this meaningful under jsdom, which has
// no layout engine: with no stylesheet applied every ancestor reads as visible,
// so the happy path is still unit-testable.
function isFocusableVisible(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  return true
}

/**
 * Global "press / to search" hotkey (GitHub/MDN convention). While the user
 * isn't already typing in a field, a bare `/` focuses the page's primary recipe
 * search — the navbar search on most pages, the page's own search on `/recipes`
 * (where the navbar one is suppressed), or the hero/menu search elsewhere — and
 * selects any existing text so it can be overtyped. Attach once at the app shell.
 */
export function useSlashFocusSearch(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only a bare `/`: never with a modifier held (leave browser/OS shortcuts
      // alone), never mid-IME-composition, and never while already typing in a
      // field (so `/` inserts normally there).
      if (
        e.key !== '/' ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing ||
        isTypingContext(e.target)
      ) {
        return
      }

      // First search input that can actually take focus. The navbar renders
      // before <main>, so on pages that keep the top-bar search it wins; the
      // visibility filter skips the closed mobile menu's still-mounted input.
      const target = Array.from(
        document.querySelectorAll<HTMLInputElement>('input.search-recipes-input')
      ).find(isFocusableVisible)
      if (!target) return

      // Suppress the `/` that would otherwise land in the field, then focus and
      // select any existing text.
      e.preventDefault()
      target.focus()
      target.select()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
