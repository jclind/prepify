import './commands'
import compareSnapshotCommand from 'cypress-image-diff-js/command'

// Registers cy.compareSnapshot() for the visual-regression spec
// (cypress/e2e/visual/type-scale.cy.ts). No-op for the other specs.
compareSnapshotCommand()

// Suppress known browser noise that doesn't indicate real app failures.
// Return true (or nothing) for anything else so actual crashes still fail tests.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop')) return false
  return true
})
