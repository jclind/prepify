const api = () => Cypress.env('API_URL')

describe('Browse', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/recipes*`, { fixture: 'recipes.json' }).as('getRecipes')
    cy.intercept('GET', `${api()}/searchAutoCompleteRecipes*`, {
      fixture: 'search-auto-complete-recipes.json',
    })
  })

  it('browse page loads and shows recipes', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet')
    cy.contains('.recipe-thumbnail', 'Grilled Salmon with Tomatoes & Basil')
  })

  it('search input filters results', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.get('input.search-recipes-input').type('Tuscan')
    cy.get('.search-recipes-btn').click()
    // App navigates to /recipes?q=Tuscan and fires a new getRecipes call
    cy.wait('@getRecipes')
    cy.url().should('include', 'q=Tuscan')
    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet')
  })

  it('clicking a recipe navigates to the single recipe page', () => {
    cy.intercept('GET', `${api()}/getRecipe*`, { fixture: 'single-recipe.json' })
    cy.intercept('GET', `${api()}/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/checkIfReviewed*`, { body: null })
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet').click()
    cy.url().should('include', '/recipes/')
    cy.contains('h1.title', 'Tuscan Chicken Skillet')
  })
})
