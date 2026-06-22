/// <reference types="cypress" />

// Requires the app to already be loaded (cy.visit called first) so __cy_signIn__ is on window.
// Pass claims (e.g. { admin: true }) to sign in as an admin.
Cypress.Commands.add('login', (claims?: Record<string, unknown>) => {
  const arg = claims
    ? { uid: 'test-cypress-user', claims }
    : 'test-cypress-user'
  cy.task('mintCustomToken', arg).then((token) => {
    cy.window().then(win => win.__cy_signIn__(token as string))
  })
})
