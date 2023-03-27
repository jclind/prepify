describe('Login/Logout Process', () => {
  beforeEach(() => {
    cy.intercept(
      'GET',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getTrendingRecipes*',
      { fixture: 'trending-recipes.json' }
    )
    cy.intercept(
      'GET',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getRecipe*',
      { fixture: 'single-recipe.json' }
    )
    cy.intercept(
      'GET',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getReviews*',
      { fixture: 'recipe-reviews.json' }
    )
  })

  it('Should render single recipe, logged out', () => {
    cy.viewport(726, 977)
    cy.visit('/')

    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet').click()

    cy.contains('h1', 'Tuscan Chicken Skillet')
    cy.contains('.ingredient', '12 ounce fettuccine')
      .click()
      .should('have.class', 'checked')

    // Test ingredient serving size change
    cy.get('button.inc').click()
    cy.contains('.ingredient', '15 ounce fettuccine')
    cy.get('button.dec').click()
    cy.contains('.ingredient', '12 ounce fettuccine')

    // Directions
    cy.contains(
      '.instruction',
      'Bring a large pot of salted water to a boil. Cook the fettuccine according to package directions; drain.'
    )

    // Reviews
    cy.contains('button.leave-review-btn', 'Add Review').click()
    cy.get('.alert').contains('Please login to add a review.')

    cy.contains('.recipe-review', 'Really enjoyed!')
  })
  it('Should render single recipe, logged in', () => {
    cy.intercept(
      'PUT',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/saveRecipe*',
      { fixture: 'save-recipe.json' }
    )
    cy.intercept(
      'PUT',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/unsaveRecipe*'
    )

    cy.login()

    // Recipe
    cy.contains('.recipe-thumbnail', 'Tuscan Chicken Skillet').click()

    cy.get('button.save-recipe-btn').click()

    cy.get('button.save-recipe-btn.saved').click()

    cy.contains('button.leave-review-btn', 'Add Review').click()
    cy.get('textarea.review-text-area').type('CYPRESS TESTING')
    cy.get('button.submit-review-btn').click()
    cy.contains('.error', 'Please add a rating before submitting your review.')

    // Logout
    cy.contains('button', 'logout').click({ force: true })
  })
})
