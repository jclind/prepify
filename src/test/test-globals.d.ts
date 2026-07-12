// Ambient types for the Vitest suite, typechecked via tsconfig.tests.json.
// Vitest runs with `globals: true` (vite.config.ts), so `describe`/`it`/
// `expect`/`vi` are globals in test files — the reference below pulls in their
// declarations. The jest-dom import loads the matcher augmentations
// (`toBeInTheDocument`, `toHaveClass`, ...) onto Vitest's `expect`, mirroring
// the runtime setup in src/test/setup.ts. (The vestigial `@types/jest`
// devDependency used to provide ambient test globals; it typed the suite
// against Jest's matchers instead of Vitest's and has been removed.)
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest'
