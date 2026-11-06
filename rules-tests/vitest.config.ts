// Storage rules tests run against the Firebase emulator, so they're kept out of
// the main Vitest run. `npm run test:rules` starts the emulator and runs these.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
})
