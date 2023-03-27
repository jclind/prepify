describe('Login/Logout Process', () => {
  it('Should render single recipe, logged in', () => {
    cy.intercept(
      'GET',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/recipes*',
      { fixture: 'recipes.json' }
    )
    cy.intercept(
      'GET',
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/searchAutoCompleteRecipes*',
      { fixture: 'search-auto-complete-recipes.json' }
    )

    cy.visit('/')
    cy.contains('a.nav-link', 'recipes').click()

    cy.get('input.search-recipes-input').type('chicken')

    cy.contains('button.recipe', 'Tuscan Chicken Skillet').click()
    cy.contains('h1.title', 'Tuscan Chicken Skillet')
  })
})
