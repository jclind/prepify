/// <reference types="cypress" />

import { email, password } from './e2e'

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

Cypress.Commands.add('login', () => {
  cy.viewport(726, 977)
  cy.visit('/')
  cy.intercept(
    'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getTrendingRecipes*',
    req => {
      req.reply(res => {
        res.send({ fixture: 'trending-recipes.json' })
      })
    }
  )
  cy.intercept(
    'GET',
    'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getUsername*',
    { body: 'testinguser' }
  )
  cy.contains('a', 'login').click()

  // Login page
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)

  cy.contains('button', 'Login').click()

  // Should be on home page
  cy.contains('a', 'Create Recipe')
})
