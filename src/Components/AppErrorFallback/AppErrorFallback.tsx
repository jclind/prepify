import React, { FC } from 'react'
import './AppErrorFallback.scss'

interface AppErrorFallbackProps {
  /** Provided by Sentry.ErrorBoundary — clears the boundary's error state. */
  resetError: () => void
}

// Shown by the global Sentry.ErrorBoundary in App.tsx when an unhandled render
// error escapes a route. The error itself is already reported to Sentry by the
// boundary; this is purely the friendly recovery UI. Kept dependency-free (no
// router/auth) so it renders even if a provider is what crashed.
const AppErrorFallback: FC<AppErrorFallbackProps> = ({ resetError }) => {
  return (
    <div className='app-error-fallback'>
      <div className='app-error-content'>
        <h1>Something went wrong</h1>
        <p>
          An unexpected error occurred. Our team has been notified. You can try
          again, or head back to the homepage.
        </p>
        <div className='app-error-actions'>
          <button className='btn' onClick={resetError}>
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
