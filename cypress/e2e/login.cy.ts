import { email, password } from 'cypress/support/e2e'

describe('Login/Logout Process', () => {
  it('Should complete email and password login process from home page on desktop view', () => {
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
    cy.contains('a', 'login').click()

    // Login page
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)

    cy.contains('button', 'Login').click()

    // Should be on home page
    cy.contains('a', 'Create Recipe')

    // Logout
    cy.contains('button', 'logout').click({ force: true })

    cy.contains('a', 'login')
  })
})
