import { defineConfig } from 'cypress'
import admin from 'firebase-admin'

export default defineConfig({
  projectId: 'k156x8',
  env: {
    API_URL: 'http://localhost:4000',
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      on('task', {
        mintCustomToken(uid: string) {
          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert(config.env.FIREBASE_SERVICE_ACCOUNT),
            })
          }
          return admin.auth().createCustomToken(uid)
        },
      })
      return config
    },
  },
})
