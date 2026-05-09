/// <reference types="cypress" />

// Requires the app to already be loaded (cy.visit called first) so __cy_signIn__ is on window.
Cypress.Commands.add('login', () => {
  cy.task('mintCustomToken', 'test-cypress-user').then((token) => {
    cy.window().then(win => win.__cy_signIn__(token as string))
  })
})
