import { lazy } from 'react'
import type { ComponentType } from 'react'

const RELOAD_FLAG = 'prepify:chunk-reload'

// sessionStorage access can throw (storage-blocked browsers, sandboxed
// frames). If it's unreadable, report the flag as already set — that disables
// the automatic reload entirely (so it can never loop) and routes failures to
// the error boundary instead.
const reloadFlagSet = (): boolean => {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) !== null
  } catch {
    return true
  }
}
const setReloadFlag = (): void => {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    // Unwritable storage also reads as set (above), so no loop either way.
  }
}

/**
 * Wraps a route chunk's import with a stale-deploy guard. Hashed chunk URLs
 * die when a deploy replaces the assets under an open tab; the first failed
 * load reloads the page once to pick up the new index.html.
 *
 * The flag is scoped to the tab session and deliberately never auto-cleared:
 * clearing it on a later successful load would re-arm the reload for a
 * persistently failing sibling (nested shells load parent-then-child, so a
 * healthy parent + broken child would reload forever). After the one reload,
 * every failure is tagged `ChunkLoadError` and thrown to the app error
 * boundary, whose "Try again" hard-reloads for this error class — React.lazy
 * caches rejections, so a plain boundary reset can never recover a chunk.
 */
export function withChunkReload<T>(
  importFn: () => Promise<T>,
  // Injectable for tests — jsdom's window.location.reload can't be stubbed.
  reload: () => void = () => window.location.reload()
): () => Promise<T> {
  return () =>
    importFn().catch((err: unknown) => {
      if (err instanceof Error) err.name = 'ChunkLoadError'
      // A dropped connection isn't a stale deploy — reloading while offline
      // would replace the working app with the browser's offline error page.
      const offline =
        typeof navigator !== 'undefined' && navigator.onLine === false
      if (offline || reloadFlagSet()) throw err
      setReloadFlag()
      reload()
      // Keep the Suspense fallback up while the page reloads — but if the
      // reload is blocked (Settings' dirty-form beforeunload guard lets the
      // user cancel it), fail the route into the error boundary rather than
      // leaving navigation hung on a promise that never settles.
      return new Promise<T>((_, rejectStuck) => {
        setTimeout(() => rejectStuck(err), 5000)
      })
    })
}

/** React.lazy for route components, with the stale-deploy reload guard. */
export function lazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  return lazy(withChunkReload(importFn))
}
