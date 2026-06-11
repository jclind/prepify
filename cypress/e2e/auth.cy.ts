import { API_URL } from '../support/constants'
const api = () => API_URL

describe('Auth', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'testinguser' })
    cy.intercept('GET', `${api()}/api/recipes*`, { fixture: 'recipes.json' })
  })

  it('login flow completes and nav shows username', () => {
    cy.visit('/')
    cy.login()
    // The desktop "Create Recipe" link only renders when logged in — a reliable login gate.
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')
    // The username lives inside the account-menu disclosure panel (hidden until opened).
    // Asserting text content is the meaningful check: username was fetched and rendered correctly.
    cy.get('.dnav-account__profile-name', { timeout: 10000 }).should('contain.text', 'testinguser')
  })

  it('logout works', () => {
    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')
    // Account menu is a click-disclosure: open it, then click Log out inside the panel.
    cy.get('button.dnav-account__btn', { timeout: 5000 }).click()
    cy.get('button.dnav-account__logout-btn', { timeout: 5000 }).should('be.visible').click()
    cy.contains('a.dnav__cta--login', 'Log in', { timeout: 5000 }).should('be.visible')
  })
})
