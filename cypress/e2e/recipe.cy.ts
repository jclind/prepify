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
    cy.contains('h1', 'Tuscan Chicken Skillet', { timeout: 5000 }).should('be.visible')
    cy.contains('.ing', 'fettuccine', { timeout: 5000 }).should('be.visible')
    cy.contains('.step', 'Bring a large pot of salted water to a boil', { timeout: 5000 }).should('be.visible')
  })

  it('shows the report kebab + footer link and prompts login when logged out', () => {
    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')

    // The quiet footer link stays available...
    cy.get('.sr-report-foot .report-control-trigger', { timeout: 5000 }).should(
      'be.visible'
    )

    // ...alongside a quick-access kebab in the top controls row. Opening it and
    // choosing "Report recipe" nudges a logged-out visitor to log in.
    cy.get('.sr-controls .report-menu-trigger').should('be.visible').click()
    cy.contains('.report-menu-item', /report recipe/i).click()
    cy.contains(/log in to report/i).should('be.visible')
    cy.contains('h2', /report this recipe/i).should('not.exist')
  })

  it('save/unsave button toggles correctly when logged in', () => {
    cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    // The unified SaveControl resolves "is this saved" from getSavedRecipeIds.
    // Back it with a stateful list the save/unsave handlers below mutate, so the
    // server "remembers" the write — useSaveRecipe reconciles its optimistic
    // cache against this list after each toggle (a static stub would report the
    // recipe un-saved again on that reconciliation refetch and revert the icon).
    // The same `getSavedRecipe*` glob also catches the popover's per-recipe
    // getSavedRecipe lookup, which has no "Ids" and gets the null body.
    let savedIds: string[] = []
    cy.intercept('GET', `${api()}/api/getSavedRecipe*`, (req) => {
      req.reply(req.url.includes('getSavedRecipeIds') ? savedIds : { body: null })
    }).as('getSavedRecipe')
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'testinguser' })
    // Opening the collections popover loads the user's folders.
    cy.intercept('GET', `${api()}/api/collections*`, { body: [] }).as('getCollections')

    // Load the app first (required for __cy_signIn__ to be on window), then sign in.
    // Firebase stores auth in IndexedDB which persists across same-origin cy.visit() calls,
    // so navigating directly to the recipe page after login works without React Router tricks.
    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')
    cy.wait('@getSavedRecipe')
    cy.get('button.save-recipe-btn', { timeout: 5000 }).should('be.visible').and('not.have.class', 'is-saved')

    // Save/unsave mutate the stateful list above so the post-write reconciliation
    // refetch sees the committed state.
    cy.intercept('POST', `${api()}/api/recipes/*/save`, (req) => {
      savedIds = [recipeId]
      req.reply({ fixture: 'save-recipe.json' })
    }).as('saveRecipe')
    cy.intercept('DELETE', `${api()}/api/recipes/*/save`, (req) => {
      savedIds = []
      req.reply({ body: {} })
    }).as('unsaveRecipe')

    // One tap saves to the master list (Spotify-style).
    cy.get('button.save-recipe-btn').click()
    cy.wait('@saveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('have.class', 'is-saved')

    // Tapping an already-saved recipe opens the collections popover; unchecking
    // the "All saved" master row there unsaves it.
    cy.get('button.save-recipe-btn').click()
    cy.contains('.collection-option.master', 'All saved').should('be.visible').click()
    cy.wait('@unsaveRecipe')
    cy.get('button.save-recipe-btn').should('be.visible').and('not.have.class', 'is-saved')
  })
})
