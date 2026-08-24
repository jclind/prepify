// Sentry (server error monitoring). Required as the very first thing in
// index.js — before express/routes load — so Sentry's auto-instrumentation can
// hook in. Entirely env-gated on SENTRY_DSN: with no DSN (local dev, CI, tests
// via supertest) init is skipped and every Sentry.* call downstream is a safe
// no-op, so behaviour is unchanged.
require('dotenv').config()
const Sentry = require('@sentry/node')
const pkg = require('./package.json')

// Build the init options. Split out (and exported below) so the release/dist
// wiring is unit-testable without actually initialising a Sentry client.
//
// RELEASE — previously absent, so every server error arrived untagged and there
// was no way to tell which build threw it. Set to the package version so it
// matches the CLIENT's release exactly (src/util/sentry.ts sends
// VITE_APP_VERSION, injected from the root package.json). Matching strings are
// the point: the two run as separate Sentry projects, and a shared release name
// is what lets you line a frontend regression up against the backend deploy that
// caused it, and mark an issue "resolved in 1.0.0" on both sides.
//
// DIST — the exact build within that version. A semver alone can't distinguish
// deploys, and this server ships many times per version. Sentry's `dist` field
// exists for precisely this, so it goes there rather than being glued onto the
// release string (which would fragment "1.0.0" into a new release per deploy and
// break resolved-in-version matching). Same RAILWAY_GIT_COMMIT_SHA that GET
// /version reports, so an error in Sentry and a curl of /version name the same
// build. Omitted entirely off-Railway, where the var is absent — better a
// missing field than a fabricated one.
function buildSentryOptions(env = process.env) {
  const sha = env.RAILWAY_GIT_COMMIT_SHA
  return {
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV || 'development',
    release: pkg.version,
    ...(sha ? { dist: sha.slice(0, 7) } : {}),
    // Light tracing — enough to surface slow requests without flooding the
    // free-tier quota.
    tracesSampleRate: 0.1,
  }
}

if (process.env.SENTRY_DSN) {
  Sentry.init(buildSentryOptions())
}

// Exported as the Sentry namespace (unchanged; index.js requires this module for
// its side effect only). `buildSentryOptions` rides along as an extra property so
// the test suite can assert the release/dist wiring — same pattern as
// routes/ingredients.js exposing PARSE_LIMIT on its router.
module.exports = Sentry
module.exports.buildSentryOptions = buildSentryOptions
