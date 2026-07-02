import React, { FC } from 'react'
import './AppErrorFallback.scss'

interface AppErrorFallbackProps {
  /** Provided by Sentry.ErrorBoundary — clears the boundary's error state. */
  resetError: () => void
  /** The caught error, when the boundary provides it. */
  error?: unknown
}

// Shown by the global Sentry.ErrorBoundary in App.tsx when an unhandled render
// error escapes a route. The error itself is already reported to Sentry by the
// boundary; this is purely the friendly recovery UI. Kept dependency-free (no
// router/auth) so it renders even if a provider is what crashed.
const AppErrorFallback: FC<AppErrorFallbackProps> = ({ resetError, error }) => {
  const tryAgain = () => {
    // A failed route chunk (tagged by src/util/lazyRoute.ts) can't be retried
    // by re-rendering — React.lazy caches the rejection — so recovery needs a
    // fresh page load to get new lazy payloads (and a fresh asset manifest).
    if (error instanceof Error && error.name === 'ChunkLoadError') {
      window.location.reload()
      return
    }
    resetError()
  }
  return (
    <div className='app-error-fallback'>
      <div className='app-error-content'>
        <h1>Something went wrong</h1>
        <p>
          An unexpected error occurred. Our team has been notified. You can try
          again, or head back to the homepage.
        </p>
        <div className='app-error-actions'>
          <button className='btn' onClick={tryAgain}>
            Try again
          </button>
          <a className='btn secondary' href='/'>
            Return home
          </a>
        </div>
      </div>
    </div>
  )
}

export default AppErrorFallback
