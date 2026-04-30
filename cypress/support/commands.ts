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
      cy.get('input[name="email"]').type(email)
      cy.get('input[name="password"]').type(password)
      cy.contains('button', 'Login').click()
      cy.contains('a.nav-link', 'Create Recipe', { timeout: 15000 })
    },
  )
})

Cypress.Commands.add('fillSignupInputs', (username, email, password, options) => {
  const ts = new Date().getTime()
  const u = options.uniqueUsername ? username + ts : username
  const e = options.uniqueEmail ? username + ts + '@gmail.com' : email
  const p = options.uniquePassword ? password + ts : password

  cy.get('input[name="name"]').type('Testing User')
  cy.get('input[name="username"]').type(u)
  cy.get('input[name="email"]').type(e)
  cy.get('input[name="password"]').type(p)

  if (options.click) {
    cy.contains('button', 'Create Username').click()
  }
})

Cypress.Commands.add('signupProcess', () => {
  cy.contains('a', 'signup').click()
  cy.fillSignupInputs(username, email, password, {
    click: true,
    uniqueUsername: true,
    uniqueEmail: true,
  })
  cy.contains('a', 'Create Recipe')
  cy.contains('button', 'logout').click({ force: true })
  cy.contains('a', 'login')
})
