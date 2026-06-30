import { defineConfig } from 'cypress'
import base from './cypress.config'

// Dedicated config for the MANUAL two-pass visual-regression run
// (cypress/visual/type-scale.cy.ts). It extends the default config (same
// plugins, tasks, support) but re-points specPattern at cypress/visual/ so the
// visual spec runs ONLY when this config is selected explicitly:
//
//   npx cypress run --config-file cypress.visual.config.ts --config baseUrl=http://localhost:3012
//
// The default cypress.config.ts (used by `cypress run` in CI) keeps its default
// specPattern of cypress/e2e/**, which does NOT match cypress/visual/ — so the
// visual spec never runs in the automated suite.
export default defineConfig({
  ...base,
  e2e: {
    ...base.e2e,
    specPattern: 'cypress/visual/**/*.cy.{ts,tsx}',
  },
})
