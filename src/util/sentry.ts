import * as Sentry from '@sentry/react'
import { version } from 'src/Components/Footer/footerData'

// ---------------------------------------------------------------------------
// Sentry (client error monitoring). Entirely env-gated on VITE_SENTRY_DSN: with
// no DSN set — local dev, CI, anyone who hasn't configured it — every export
// here no-ops, so the app behaves exactly as before. Init runs once at startup
// (src/index.tsx) before the app mounts so the global ErrorBoundary and network
// interceptor have a live client to report to.
// ---------------------------------------------------------------------------

const dsn = import.meta.env.VITE_SENTRY_DSN

/** True only once a DSN is configured and init has run. */
export const sentryEnabled = Boolean(dsn)

export function initSentry(): void {
  if (!sentryEnabled) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: version,
    // Light tracing — enough to spot slow transactions without flooding the
    // free-tier quota. Bump if/when we actually use performance data.
    tracesSampleRate: 0.1,
  })
}

/**
 * Attach the signed-in user to error reports so a crash is traceable to an
 * account. Called from AuthContext on auth state changes; clears on logout.
 * No-ops when Sentry is disabled.
 */
export function setSentryUser(user: { uid: string } | null): void {
  if (!sentryEnabled) return
  Sentry.setUser(user ? { id: user.uid } : null)
}

export { Sentry }
