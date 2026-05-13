import { API_URL } from '../support/constants'
const api = () => API_URL

describe('Single Recipe', () => {
  let recipeId: string

  before(() => {
    cy.fixture('single-recipe.json').then((recipe) => {
      recipeId = recipe._id
    })
  })

  beforeEach(() => {
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: null })
  })

  it('renders title, ingredients, and instructions', () => {
    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')
    cy.contains('h1.title', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
    cy.contains('.ingredient', 'fettuccine', { timeout: 5000 }).should('be.visible')
    cy.contains('.instruction', 'Bring a large pot of salted water to a boil', { timeout: 5000 }).should('be.visible')
  })

  it('save/unsave button toggles correctly when logged in', () => {
    cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/api/getSavedRecipe*`, { body: [] }).as('getSavedRecipe')
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'testinguser' })

    // Load the app first (required for __cy_signIn__ to be on window), then sign in.
    // Firebase stores auth in IndexedDB which persists across same-origin cy.visit() calls,
    // so navigating directly to the recipe page after login works without React Router tricks.
    cy.visit('/')
    cy.login()
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 }).should('be.visible')

    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')
    cy.wait('@getSavedRecipe')
    cy.get('button.save-recipe-btn', { timeout: 5000 }).should('be.visible').and('not.have.class', 'saved')

    cy.intercept('POST', `${api()}/api/recipes/*/save`, { fixture: 'save-recipe.json' }).as('saveRecipe')
    cy.intercept('DELETE', `${api()}/api/recipes/*/save`, { body: {} }).as('unsaveRecipe')

    cy.get('button.save-recipe-btn').click()
    cy.wait('@saveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('have.class', 'saved')

    cy.get('button.save-recipe-btn').click()
    cy.wait('@unsaveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('not.have.class', 'saved')
  })
})
