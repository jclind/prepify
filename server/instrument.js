// Sentry (server error monitoring). Required as the very first thing in
// index.js — before express/routes load — so Sentry's auto-instrumentation can
// hook in. Entirely env-gated on SENTRY_DSN: with no DSN (local dev, CI, tests
// via supertest) init is skipped and every Sentry.* call downstream is a safe
// no-op, so behaviour is unchanged.
require('dotenv').config()
const Sentry = require('@sentry/node')

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Light tracing — enough to surface slow requests without flooding the
    // free-tier quota.
    tracesSampleRate: 0.1,
  })
}

module.exports = Sentry
