Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false
})

describe('Login/Logout Process', () => {
  it('Should complete email and password login process from home page on desktop view', () => {
    cy.login()

    // Logout
    cy.contains('button', 'logout').click({ force: true })

    cy.contains('a', 'login')
  })
})
