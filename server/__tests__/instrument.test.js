/**
 * Sentry init wiring (server/instrument.js).
 *
 * The release tag was missing entirely until 2026-08-24, so every server error
 * arrived untagged and there was no way to attribute one to a build. These lock
 * in the release/dist contract; they don't initialise a real Sentry client.
 */
const { buildSentryOptions } = require('../instrument')
const pkg = require('../package.json')

describe('buildSentryOptions', () => {
  const base = { SENTRY_DSN: 'https://key@example.ingest.sentry.io/1' }

  it('tags the release with the package version', () => {
    expect(buildSentryOptions(base).release).toBe(pkg.version)
  })

  // The client (src/util/sentry.ts) sends VITE_APP_VERSION, injected from the
  // root package.json. Same string on both sides is what makes a frontend
  // regression line up with the backend deploy that caused it.
  it('uses a release string the client can match on', () => {
    const rootPkg = require('../../package.json')
    expect(buildSentryOptions(base).release).toBe(rootPkg.version)
  })

  it('reports the exact build as `dist`, not glued onto the release', () => {
    const opts = buildSentryOptions({
      ...base,
      RAILWAY_GIT_COMMIT_SHA: '6bb2954aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })
    expect(opts.dist).toBe('6bb2954')
    // Fragmenting the release per deploy would break resolved-in-version matching.
    expect(opts.release).toBe(pkg.version)
    expect(opts.release).not.toContain('6bb2954')
  })

  it('omits `dist` entirely off-Railway rather than sending a fabricated one', () => {
    const opts = buildSentryOptions(base)
    expect(opts).not.toHaveProperty('dist')
  })

  it('passes the DSN and environment through, defaulting env to development', () => {
    expect(buildSentryOptions(base).environment).toBe('development')
    expect(buildSentryOptions({ ...base, NODE_ENV: 'production' }).environment).toBe('production')
    expect(buildSentryOptions(base).dsn).toBe(base.SENTRY_DSN)
  })
})
