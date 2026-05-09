import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, 'src')],
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Only run frontend tests — prevents Vitest from picking up server's Jest suite.
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // react-loader-spinner v8 uses SVG features incompatible with jsdom
    alias: {
      'react-loader-spinner': path.resolve(
        __dirname,
        './src/test/mocks/react-loader-spinner.tsx'
      ),
    },
  },
})
