import { API_URL } from '../support/constants'
const api = () => API_URL

// Report-a-user (track 3c): the report affordance on a public profile, its
// logged-out login nudge, and the resulting report surfacing in the admin queue.
describe('Report a user', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/api/getPublicProfile*`, {
      fixture: 'public-profile.json',
    }).as('getProfile')
  })

  it('shows the report kebab to logged-out visitors and prompts login on click', () => {
    cy.visit('/u/baduser')
    cy.wait('@getProfile')

    // The kebab is visible even when logged out, so visitors know reporting
    // exists. Open it, then click "Report user".
    cy.get('.pp-handle-row .report-menu-trigger', { timeout: 5000 })
      .should('be.visible')
      .click()
    cy.contains('.report-menu-item', /report user/i).click()

    // Clicking nudges to log in instead of opening the report modal.
    cy.contains(/log in to report/i).should('be.visible')
    cy.contains('h2', /report this user/i).should('not.exist')
  })

  it('lets a logged-in user report a profile with the user target', () => {
    // The viewer's own handle differs from the profile, so the control shows.
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'gooduser' })
    cy.intercept('POST', `${api()}/api/reports`, (req) => {
      // The payload names the user target and carries no recipeId.
      expect(req.body).to.include({
        targetType: 'user',
        reportedUsername: 'baduser',
        reason: 'spam',
      })
      expect(req.body).to.not.have.property('recipeId')
      req.reply({
        statusCode: 201,
        body: { _id: 'rep-user-1', status: 'open', ...req.body },
      })
    }).as('createReport')

    // Load the app first (so __cy_signIn__ exists on window), then sign in.
    cy.visit('/')
    cy.login()
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit('/u/baduser')
    cy.wait('@getProfile')

    cy.get('.pp-handle-row .report-menu-trigger', { timeout: 5000 })
      .should('be.visible')
      .click()
    cy.contains('.report-menu-item', /report user/i).click()
    cy.contains('h2', /report this user/i).should('be.visible')
    cy.get('.report-submit-btn').click()

    cy.wait('@createReport')
    cy.contains(/thanks/i).should('be.visible')
  })

  it('surfaces the user report in the admin queue', () => {
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'gooduser' })
    cy.intercept('GET', `${api()}/api/reports*`, {
      body: {
        reports: [
          {
            _id: 'rep-user-1',
            targetType: 'user',
            reportedUsername: 'baduser',
            reportedUid: 'bad-uid',
            reporterUid: 'reporter-uid',
            reason: 'offensive',
            details: '',
            status: 'open',
            createdAt: '2026-06-22T00:00:00.000Z',
            target: { recipe: null, review: null },
          },
        ],
        totalCount: 1,
        openCount: 1,
      },
    }).as('listReports')

    cy.visit('/')
    cy.login({ admin: true })
    cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')

    cy.visit('/admin/reports')
    cy.wait('@listReports')

    cy.contains('.report-card', '@baduser').within(() => {
      cy.get('.type-pill.user').should('contain.text', 'user')
      cy.contains(/reported user/i).should('exist')
    })
  })
})
