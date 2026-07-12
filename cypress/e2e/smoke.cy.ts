import { API_URL } from '../support/constants'
const api = () => API_URL

// Logged-in smoke test for the track-3c work: username inline validation, the
// hero rating echo, and the report kebabs (recipe / review / user) all the way
// through a successful submit. Report writes are stubbed so the run doesn't
// touch the database; auth is a real Firebase sign-in.
describe('Smoke: track-3c report + username work (logged in)', () => {
  let recipeId: string

  before(() => {
    cy.fixture('single-recipe.json').then(r => {
      recipeId = r._id
    })
  })

  // A report POST that echoes back a 201 without hitting the DB.
  const stubReports = () =>
    cy.intercept('POST', `${api()}/api/reports`, req => {
      req.reply({ statusCode: 201, body: { _id: 'smoke-rep', status: 'open', ...req.body } })
    }).as('createReport')

  it('username page: inline validation rejects bad characters and accepts a clean handle', () => {
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: null })
    cy.intercept('GET', `${api()}/api/checkUsernameAvailability*`, { body: true }).as('checkAvail')

    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit('/create-username')
    cy.get('input[name="username"]', { timeout: 10000 }).should('be.visible')

    // Disallowed character → the mirrored server rule shows inline.
    cy.get('input[name="username"]').type('bad@name')
    cy.contains(/letters, numbers/i).should('be.visible')

    // A clean handle clears the error and reports availability.
    cy.get('input[name="username"]').clear().type('goodname')
    cy.wait('@checkAvail')
    cy.contains(/goodname is available/i).should('be.visible')
  })

  it('recipe page: shows the hero rating, footer link, and a working report kebab', () => {
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'gooduser' })
    cy.intercept('GET', `${api()}/api/getSavedRecipe*`, { body: [] })
    stubReports()

    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')

    // Item 4: the rating echo by the title (fixture has 4.3 over 3 ratings).
    cy.get('.hero-rating', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', '4.3')
      .and('contain.text', '3 ratings')

    // The footer link stays, and the top kebab reports the recipe.
    cy.get('.sr-report-foot .report-control-trigger').should('be.visible')
    cy.get('.sr-controls .report-menu-trigger').should('be.visible').click()
    cy.contains('.report-menu-item', /report recipe/i).click()
    cy.contains('h2', /report this recipe/i).should('be.visible')
    cy.get('.report-submit-btn').click()
    cy.wait('@createReport').its('request.body').should('deep.include', {
      targetType: 'recipe',
      recipeId,
    })
    cy.contains(/thanks/i).should('be.visible')
  })

  it('recipe page: a review row has a working report kebab', () => {
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' }).as('getRecipe')
    cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    // Viewer is not any of the review authors, so every review offers a report.
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'gooduser' })
    cy.intercept('GET', `${api()}/api/getSavedRecipe*`, { body: [] })
    stubReports()

    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit(`/recipes/${recipeId}`)
    cy.wait('@getRecipe')

    cy.get('.review-options .report-menu-trigger', { timeout: 8000 })
      .first()
      .should('be.visible')
      .click()
    cy.contains('.report-menu-item', /report review/i).click()
    cy.contains('h2', /report this review/i).should('be.visible')
    cy.get('.report-submit-btn').click()
    cy.wait('@createReport').its('request.body').should('include', {
      targetType: 'review',
    })
    cy.contains(/thanks/i).should('be.visible')
  })

  it('profile page: report-user kebab submits a user report', () => {
    cy.intercept('GET', `${api()}/api/getPublicProfile*`, { fixture: 'public-profile.json' }).as('getProfile')
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'gooduser' })
    stubReports()

    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit('/u/baduser')
    cy.wait('@getProfile')

    cy.get('.pp-handle-row .report-menu-trigger', { timeout: 5000 }).should('be.visible').click()
    cy.contains('.report-menu-item', /report user/i).click()
    cy.contains('h2', /report this user/i).should('be.visible')
    cy.get('.report-submit-btn').click()
    cy.wait('@createReport').its('request.body').should('deep.include', {
      targetType: 'user',
      reportedUsername: 'baduser',
    })
    cy.contains(/thanks/i).should('be.visible')
  })
})
