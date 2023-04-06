import { email, password, username } from 'cypress/support/e2e'

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false
})

Cypress.Commands.add(
  'fillSignupInputs',
  (username, email, password, options) => {
    const newDate = new Date().getTime()

    const updatedUsername = options.uniqueUsername
      ? username + newDate
      : username
    const updatedEmail = options.uniqueEmail
      ? username + newDate + '@gmail.com'
      : email
    const updatePassword = options.uniquePassword
      ? password + newDate
      : password

    cy.get('input[name="name"]').type('Testing User')
    cy.get('input[name="username"]').type(updatedUsername)
    cy.get('input[name="email"]').type(updatedEmail)
    cy.get('input[name="password"]').type(updatePassword)

    if (options.click) {
      cy.contains('button', 'Create Username').click()
    }
  }
)
Cypress.Commands.add('signupProcess', () => {
  cy.contains('a', 'signup').click()

  cy.fillSignupInputs(username, email, password, {
    click: true,
    uniqueUsername: true,
    uniqueEmail: true,
  })

  // Should be on home page
  cy.contains('a', 'Create Recipe')

  // Logout
  cy.contains('button', 'logout').click({ force: true })

  cy.contains('a', 'login')
})

describe('Login/Logout Process', () => {
  it('All links should work', () => {
    cy.visit('/signup')
    // Home page
    cy.contains('a', 'Prepify').click()
    cy.contains('a', 'recipes')
    cy.visit('/signup')
    // Login Page
    cy.contains('a', 'Login').click()
    cy.contains('h1', 'Login')
  })

  it('Should not allow signup if no inputs are filled', () => {
    cy.visit('/signup')

    cy.contains('button', 'Create Username').click()
    cy.contains('a', 'Create Recipe').should('not.exist')
  })
  it('Should not allow signup if username is taken', () => {
    cy.visit('/signup')

    cy.fillSignupInputs(username, email, password, {
      click: true,
      uniqueEmail: true,
    })

    cy.get('.error').contains('testinguser has already been taken')
  })
  it('Should not allow signup if email is taken', () => {
    cy.visit('/signup')

    cy.fillSignupInputs(username, email, password, {
      click: true,
      uniqueUsername: true,
    })
    cy.get('.error').contains('Email is already in use')
  })
  it('Should not allow signup if password is too short', () => {
    cy.visit('/signup')

    const weakPassword = '12345'
    cy.fillSignupInputs(username, email, weakPassword, {
      click: true,
      uniqueEmail: true,
      uniqueUsername: true,
    })
    cy.get('.error').contains('Password must be 6 characters or more')
  })
  it('Should complete email and password and username signup process from home page on desktop view', () => {
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
    cy.signupProcess()
  })
  it('Should complete signup process on mobile', () => {
    cy.viewport(375, 977)
    cy.visit('/')
    cy.get('.hamburger-react').click()
    cy.signupProcess()
  })
})
