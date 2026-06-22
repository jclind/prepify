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

  it('shows the autocomplete dropdown with results as you type', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.get('.recipes-page input.search-recipes-input', { timeout: 10000 })
      .should('be.visible')
      .type('chic')
    // Dropdown appears (debounced) and renders the fixture results.
    cy.get('.auto-complete-results', { timeout: 5000 }).should('be.visible')
    cy.get('.auto-complete-results .ac-item__title')
      .should('have.length.greaterThan', 0)
      .first()
      .should('contain.text', 'Tuscan Chicken Skillet')
    // Footer affordance runs the full search for the typed term.
    cy.get('.auto-complete-results .ac-footer').should('contain.text', 'chic')
  })

  it('clicking an autocomplete result navigates to that recipe', () => {
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    cy.get('.recipes-page input.search-recipes-input', { timeout: 10000 })
      .should('be.visible')
      .type('chic')
    cy.get('.auto-complete-results .ac-item', { timeout: 5000 }).first().click()
    cy.url().should('include', '/recipes/')
  })

  it('does not duplicate the search in the top navbar on /recipes', () => {
    cy.visit('/recipes')
    cy.wait('@getRecipes')
    // The page owns the only search; the desktop bar omits its own here.
    cy.get('.dnav__search').should('not.exist')
    cy.get('input.search-recipes-input').should('have.length', 1)
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
