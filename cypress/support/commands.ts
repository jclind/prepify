/// <reference types="cypress" />

import { email, password, username } from './e2e'

Cypress.Commands.add('login', () => {
  const apiUrl = Cypress.env('API_URL')
  cy.session(
    'prepify-user',
    () => {
      // Stub the requests triggered after Firebase redirects to home on login
      cy.intercept('GET', `${apiUrl}/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
      cy.intercept('GET', `${apiUrl}/getUsername*`, { body: 'testinguser' })
      cy.visit('/login')
      cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(email)
      cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(password)
      cy.contains('button', 'Login', { timeout: 5000 }).should('be.visible').click().and('be.visible')
      cy.contains('a.nav-link', 'Create Recipe', { timeout: 15000 }).and('be.visible')
    },
  )
})

Cypress.Commands.add('fillSignupInputs', (username, email, password, options) => {
  const ts = new Date().getTime()
  const u = options.uniqueUsername ? username + ts : username
  const e = options.uniqueEmail ? username + ts + '@gmail.com' : email
  const p = options.uniquePassword ? password + ts : password

  cy.get('input[name="name"]', { timeout: 10000 }).should('be.visible').type('Testing User')
  cy.get('input[name="username"]', { timeout: 10000 }).should('be.visible').type(u)
  cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type(e)
  cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible').type(p)

  if (options.click) {
    cy.contains('button', 'Create Username', { timeout: 5000 }).should('be.visible').click().and('be.visible')
  }
})

Cypress.Commands.add('signupProcess', () => {
  cy.contains('a', 'signup', { timeout: 5000 }).should('be.visible').click()
  cy.fillSignupInputs(username, email, password, {
    click: true,
    uniqueUsername: true,
    uniqueEmail: true,
  })
  cy.contains('a', 'Create Recipe', { timeout: 10000 }).should('be.visible')
  cy.contains('button', 'logout', { timeout: 5000 }).should('be.visible').click({ force: true }).and('be.visible')
  cy.contains('a', 'login', { timeout: 5000 }).should('be.visible')
})
