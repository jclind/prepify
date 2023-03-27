describe('Home Page', () => {
  it('Should show all elements', () => {
    cy.visit('/')
    cy.get('img.background').should('be.visible')
    cy.contains('Save money. Reduce stress. Be healthy.')
  })
  it('Should display trending recipes with mock', () => {
    cy.visit('/')
    // cy.intercept(
    //   'GET',
    //   'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getTrendingRecipes?limit=4',
    //   { fixture: 'trending-recipes.json' }
    // )
    cy.intercept(
      'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/getTrendingRecipes*',
      req => {
        req.reply(res => {
          res.send({ fixture: 'trending-recipes.json' })
        })
      }
    )
    cy.get('.recipes').should('contain', 'Tuscan Chicken Skillet')
    cy.get('.recipes').should('contain', 'Serving: $2.00 | Recipe: $8.00')
  })
})
