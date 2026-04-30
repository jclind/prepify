import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Mirror CRA's baseUrl: "." so imports like 'src/api/auth' resolve correctly.
      src: path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Only run frontend tests — prevents Vitest from picking up server's Jest suite.
    include: ['src/**/*.test.{ts,tsx}'],
    // Skip SCSS/CSS transforms in tests: sass@1.58 (bundled via CRA) lacks
    // initAsyncCompiler required by Vite 5's CSS pipeline.
    css: false,
  },
})
