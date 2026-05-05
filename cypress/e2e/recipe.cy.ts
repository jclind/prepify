const api = () => Cypress.env('API_URL')
const RECIPE_ID = '6408d2495491ab77fb7780b0'

describe('Single Recipe', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/checkIfReviewed*`, { body: null })
    cy.intercept('GET', `${api()}/getUsername*`, { body: null })
  })

  it('renders title, ingredients, and instructions', () => {
    cy.visit(`/recipes/${RECIPE_ID}`)
    cy.wait('@getRecipe')
    cy.contains('h1.title', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
    cy.contains('.ingredient', 'fettuccine', { timeout: 5000 }).should('be.visible')
    cy.contains('.instruction', 'Bring a large pot of salted water to a boil', { timeout: 5000 }).should('be.visible')
  })

  it('save/unsave button toggles correctly when logged in', () => {
    // Stub every route the app will hit during navigation
    cy.intercept('GET', `${api()}/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/recipes*`, { fixture: 'recipes.json' }).as('getRecipes')
    cy.intercept('GET', `${api()}/searchAutoCompleteRecipes*`, { body: [] })
    cy.intercept('GET', `${api()}/getSavedRecipe*`, { body: [] }).as('getSavedRecipe')
    cy.intercept('GET', `${api()}/getUsername*`, { body: 'testinguser' })

    cy.login()

    // Visit home page so Firebase auth has time to fully initialize (onAuthStateChanged fires)
    cy.visit('/')
    cy.contains('a.nav-link', 'Create Recipe', { timeout: 10000 }).should('be.visible')

    // Use React Router navigation (no full page reload) so auth.currentUser stays in memory
    cy.contains('a.nav-link', 'recipes', { timeout: 5000 }).should('be.visible').click()
    cy.wait('@getRecipes')
    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible').click()
    cy.wait('@getRecipe')

    // SaveRecipeBtn reads auth.currentUser (non-null now) and calls getSavedRecipe on mount
    cy.wait('@getSavedRecipe')
    cy.get('button.save-recipe-btn', { timeout: 5000 }).should('be.visible').and('not.have.class', 'saved')

    cy.intercept('PUT', `${api()}/saveRecipe*`, { fixture: 'save-recipe.json' }).as('saveRecipe')
    cy.intercept('PUT', `${api()}/unsaveRecipe*`, { body: {} }).as('unsaveRecipe')

    cy.get('button.save-recipe-btn').click()
    cy.wait('@saveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('have.class', 'saved')

    cy.get('button.save-recipe-btn').click()
    cy.wait('@unsaveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('not.have.class', 'saved')
  })
})
