const api = () => Cypress.env('API_URL')

describe('Auth', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/getUsername*`, { body: 'testinguser' })
  })

  it('login flow completes and nav shows username', () => {
    cy.login()
    cy.visit('/')
    // Wait for Firebase auth to initialize — 'Create Recipe' only appears when logged in
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 })
    // Username appears in the nav dropdown after getUsername resolves
    cy.get('.signed-in-as strong', { timeout: 10000 }).should('contain.text', 'testinguser')
  })

  it('logout works', () => {
    cy.login()
    cy.visit('/')
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 })
    // The logout button lives inside a CSS hover-dropdown — force bypasses visibility
    cy.get('button.logout').click({ force: true })
    cy.contains('a.nav-link', 'login')
  })
})
