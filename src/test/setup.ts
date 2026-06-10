import '@testing-library/jest-dom'
import { configure } from '@testing-library/dom'

// The print-only PrintableRecipe subtree is always mounted (aria-hidden) so the
// react-to-print ref points at live data, and it duplicates on-screen text.
// jsdom doesn't apply the `@media screen { display:none }` that hides it, so
// ignore aria-hidden content in queries — tests assert on the visible page.
configure({
  defaultIgnore: 'script, style, [aria-hidden="true"], [aria-hidden="true"] *',
})

// react-modal calls Modal.setAppElement('#root') at module scope in several
// components. The element must exist in jsdom before those modules are imported.
const rootEl = document.createElement('div')
rootEl.id = 'root'
document.body.appendChild(rootEl)

// jsdom doesn't implement matchMedia; stub it (defaults to "not mobile" so the
// mobile nav menu doesn't mount in component/app tests unless a test overrides).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)
}
