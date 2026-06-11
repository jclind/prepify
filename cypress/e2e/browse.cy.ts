import { API_URL } from '../support/constants'
const api = () => API_URL

describe('Browse', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    cy.intercept('GET', `${api()}/api/recipes*`, { fixture: 'recipes.json' }).as('getRecipes')
    cy.intercept('GET', `${api()}/api/searchAutoCompleteRecipes*`, {
      fixture: 'search-auto-complete-recipes.json',
    })
  })

  it('browse page loads and shows recipes', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.contains('.recipe-card', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
    cy.contains('.recipe-card', 'Grilled Salmon with Tomatoes & Basil', { timeout: 5000 }).should('be.visible')
  })

  it('search input filters results', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    // The navbar also renders a SearchRecipesInput, so scope to the page's input/button.
    cy.get('.recipes-page input.search-recipes-input', { timeout: 10000 }).should('be.visible').type('Tuscan')
    cy.get('.recipes-page .search-recipes-btn', { timeout: 5000 }).should('be.visible').click().and('be.visible')
    // App navigates to /recipes?q=Tuscan and fires a new getRecipes call
    cy.wait('@getRecipes')
    cy.url().should('include', 'q=Tuscan')
    cy.contains('.recipe-card', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
  })

  it('clicking a recipe navigates to the single recipe page', () => {
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.contains('.recipe-card', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible').click()
    cy.wait('@getRecipe')
    cy.url().should('include', '/recipes/')
    cy.contains('h1', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
  })
})
