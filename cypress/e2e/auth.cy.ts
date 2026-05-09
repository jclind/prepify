const api = () => Cypress.env('API_URL')

describe('Auth', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/getUsername*`, { body: 'testinguser' })
    cy.intercept('GET', `${api()}/recipes*`, { fixture: 'recipes.json' })
  })

  it('login flow completes and nav shows username', () => {
    cy.visit('/')
    cy.login()
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 }).should('be.visible')
    // .signed-in-as lives inside a CSS hover-only dropdown so be.visible would always fail.
    // Asserting text content is the meaningful check: username was fetched and rendered correctly.
    cy.get('.signed-in-as strong', { timeout: 10000 }).should('contain.text', 'testinguser')
  })

  it('logout works', () => {
    cy.visit('/')
    cy.login()
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 }).should('be.visible')
    // The logout button lives inside a CSS hover-dropdown — force bypasses visibility
    cy.get('button.logout', { timeout: 5000 }).click({ force: true })
    cy.contains('a.nav-link', 'login', { timeout: 5000 }).should('be.visible')
  })
})
