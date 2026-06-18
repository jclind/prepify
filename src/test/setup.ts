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

// Web Storage shim. Node >= 24 ships an experimental built-in `localStorage`
// global that, without `--localstorage-file`, is unusable (throws / reads as
// undefined and emits an ExperimentalWarning) AND shadows jsdom's own
// implementation. So on any Node newer than CI's, tests that touch Web Storage
// crash with "Cannot read properties of undefined (reading 'clear')". Install a
// minimal in-memory Storage only when a working one is absent — when jsdom's
// real implementation is usable (e.g. CI's Node) this leaves it untouched.
const createMemoryStorage = (): Storage => {
  let store: Record<string, string> = {}
  return {
    get length() {
      return Object.keys(store).length
    },
    clear() {
      store = {}
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null
    },
    removeItem(key: string) {
      delete store[key]
    },
    setItem(key: string, value: string) {
      store[key] = String(value)
    },
  } as Storage
}

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
  let usable = false
  try {
    const existing = (globalThis as Record<string, unknown>)[name] as
      | Storage
      | undefined
    if (existing) {
      existing.setItem('__storage_probe__', '1')
      existing.removeItem('__storage_probe__')
      usable = true
    }
  } catch {
    usable = false
  }
  if (usable) return

  const memory = createMemoryStorage()
  const define = (target: object) => {
    try {
      Object.defineProperty(target, name, {
        configurable: true,
        value: memory,
      })
    } catch {
      /* non-configurable on this target — fall through to the other */
    }
  }
  define(globalThis)
  if (typeof window !== 'undefined') define(window)
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')
