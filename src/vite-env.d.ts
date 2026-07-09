/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Injected at build time from package.json via `define` in vite.config.ts.
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
