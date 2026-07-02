import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(async () => ({
  plugins: [
    react(),
    // Opt-in bundle analysis: `ANALYZE=1 npm run build` writes reports/stats.html
    // (treemap of what each chunk is made of). Kept out of build/ so an analyze
    // run can never leak the module map into the deployed site. Dynamic import
    // because the plugin is ESM-only and this config loads as CJS.
    ...(process.env.ANALYZE === '1'
      ? [
          (await import('rollup-plugin-visualizer')).visualizer({
            filename: 'reports/stats.html',
            gzipSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      types: path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Pre-transform the biggest lazy route chunks on dev-server start. With
    // route-splitting, the dev server otherwise transforms a lazy page's whole
    // module graph on first navigation — a pause Cypress specs with tight
    // timeouts (AddRecipe, Admin) would feel as flake.
    warmup: {
      clientFiles: [
        './src/pages/AddRecipe/AddRecipe.tsx',
        './src/pages/Admin/AdminLayout.tsx',
        './src/pages/Admin/Reports/Reports.tsx',
      ],
    },
  },
  build: {
    outDir: 'build',
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
}))
