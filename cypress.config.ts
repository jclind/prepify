import { defineConfig } from 'cypress'
// firebase-admin v14 removed the legacy `admin.*` namespace — use the modular
// entry points (mirrors the server-side migration in server/middleware/auth.js).
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import getCompareSnapshotsPlugin from 'cypress-image-diff-js/plugin'

export default defineConfig({
  projectId: 'k156x8',
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Visual-regression plugin (cypress-image-diff-js). Registers its own
      // tasks + after:screenshot hook; Cypress merges these with the on('task')
      // registration below.
      const updatedConfig = getCompareSnapshotsPlugin(on, config)
      on('task', {
        // Accepts a bare uid, or { uid, claims } to bake developer claims (e.g.
        // { admin: true }) into the token — these propagate to the ID token's
        // claims, which AuthContext reads to set isAdmin.
        mintCustomToken(arg: string | { uid: string; claims?: Record<string, unknown> }) {
          if (!getApps().length) {
            // Accept the service account as a parsed object (cypress.env.json) or
            // a JSON string (a CYPRESS_FIREBASE_SERVICE_ACCOUNT env var).
            const svc = config.env.FIREBASE_SERVICE_ACCOUNT
            const credential = typeof svc === 'string' ? JSON.parse(svc) : svc
            initializeApp({
              credential: cert(credential),
            })
          }
          const uid = typeof arg === 'string' ? arg : arg.uid
          const claims = typeof arg === 'string' ? undefined : arg.claims
          return getAuth().createCustomToken(uid, claims)
        },
      })
      return updatedConfig
    },
  },
})
