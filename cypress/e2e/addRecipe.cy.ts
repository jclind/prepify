import { API_URL } from '../support/constants'

const api = () => API_URL

const ADD_RECIPE_URL = `${api()}/api/addRecipe`
const PARSE_URL = `${api()}/api/ingredients/parse`
const NUTRITION_URL = '**edamam.com/api/nutrition-details**'

// A 1x1 transparent PNG as a base64 buffer for the image picker.
const tinyPng = Cypress.Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
)

const selectImage = () => {
  cy.get('input[type=file]').selectFile(
    { contents: tinyPng, fileName: 'photo.png', mimeType: 'image/png' },
    { force: true }
  )
}

const setPrepTime = () => {
  // TimeInput renders two number inputs prefixed by "Hours" and "Minutes" labels;
  // they share styling with all other RecipeFormInput instances, so use a scoped
  // selector via the prep-time wrapper.
  cy.get('.prep-time .recipe-form-input input').first().type('0')
  cy.get('.prep-time .recipe-form-input input').last().type('30')
}

const setMealType = () => {
  // MealTypeSelector has closeMenuOnSelect={false} so the dropdown stays open
  // after picking. Type, Enter to select, then Escape to close — otherwise the
  // dropdown overlay covers the submit button and click is blocked.
  cy.get('.course').within(() => {
    cy.get('input').first().type('Dinner', { force: true })
    cy.get('input').first().type('{enter}', { force: true })
    cy.get('input').first().type('{esc}', { force: true })
  })
}

const fillRequiredFields = (opts: { skipImage?: boolean } = {}) => {
  cy.get('input[placeholder="Add a title to your recipe."]').type('Cypress Recipe')
  if (!opts.skipImage) selectImage()
  cy.get('textarea[placeholder="Add a description to your recipe"]').type(
    'A short description for the Cypress recipe.'
  )
  cy.get('input[placeholder="How many servings does your recipe make?"]').type('4')
  setPrepTime()
  cy.get('input[placeholder="Add ingredients to your recipe."]').type('2 cups flour{enter}')
  cy.wait('@parseIngredient')
  cy.get('input[placeholder="Add instruction for your recipe."]').type('Mix the dough{enter}')
  setMealType()
}

// ---- Filled-out smoke scenarios ----
// Each scenario fills the entire form with a distinct, realistic recipe and submits.
// They share the happy-path backend stubs (the parse intercept always returns the same
// fixture regardless of input, so the assertions key off form state, not parsed output).

type RecipeScenario = {
  title: string
  description: string
  servings: string
  prepTime: { hours: string; minutes: string }
  cookTime?: { hours: string; minutes: string }
  cuisine?: string
  ingredients: string[]
  instructions: string[]
  mealTypes: string[]
}

const setCookTime = (hours: string, minutes: string) => {
  cy.get('.cook-time .recipe-form-input input').first().clear().type(hours)
  cy.get('.cook-time .recipe-form-input input').last().clear().type(minutes)
}

const setCuisine = (cuisine: string) => {
  // CuisineSelector is a single-select react-select; type to filter then Enter to pick.
  cy.get('.cuisine').within(() => {
    cy.get('input').first().type(cuisine, { force: true })
    cy.get('input').first().type('{enter}', { force: true })
  })
}

const setMealTypes = (mealTypes: string[]) => {
  // MealTypeSelector has closeMenuOnSelect={false}, so add each then Escape once at the
  // end — otherwise the open dropdown overlays and blocks the submit button.
  cy.get('.course').within(() => {
    mealTypes.forEach(mealType => {
      cy.get('input').first().type(mealType, { force: true })
      cy.get('input').first().type('{enter}', { force: true })
    })
    cy.get('input').first().type('{esc}', { force: true })
  })
}

const fillScenario = (s: RecipeScenario) => {
  cy.get('input[placeholder="Add a title to your recipe."]').type(s.title)
  selectImage()
  cy.get('textarea[placeholder="Add a description to your recipe"]').type(s.description)
  cy.get('input[placeholder="How many servings does your recipe make?"]').type(s.servings)

  cy.get('.prep-time .recipe-form-input input').first().clear().type(s.prepTime.hours)
  cy.get('.prep-time .recipe-form-input input').last().clear().type(s.prepTime.minutes)
  if (s.cookTime) setCookTime(s.cookTime.hours, s.cookTime.minutes)

  s.ingredients.forEach(ingredient => {
    cy.get('input[placeholder="Add ingredients to your recipe."]').type(`${ingredient}{enter}`)
    cy.wait('@parseIngredient')
  })
  s.instructions.forEach(instruction => {
    cy.get('input[placeholder="Add instruction for your recipe."]').type(`${instruction}{enter}`)
  })

  if (s.cuisine) setCuisine(s.cuisine)
  setMealTypes(s.mealTypes)
}

// A maximal recipe: multiple ingredients/instructions, a cuisine, a cook time, and
// multiple meal types — i.e. all the ground the minimal happy-path test above doesn't
// cover. One scenario is enough; extra near-identical full submits add runtime without
// new coverage.
const fullRecipeScenario: RecipeScenario = {
  title: 'Weeknight Veggie Stir-Fry',
  description: 'A quick, colourful stir-fry packed with vegetables over rice.',
  servings: '4',
  prepTime: { hours: '0', minutes: '20' },
  cookTime: { hours: '0', minutes: '15' },
  cuisine: 'Asian',
  ingredients: ['2 cups broccoli', '1 red bell pepper', '3 tbsp soy sauce', '2 cups rice'],
  instructions: [
    'Cook the rice according to package directions.',
    'Heat oil and stir-fry the vegetables until tender-crisp.',
    'Add soy sauce, toss, and serve over the rice.',
  ],
  mealTypes: ['Dinner', 'Quick'],
}

const loginAndVisitAddRecipe = () => {
  // The Cypress sign-in bridge (window.__cy_signIn__) is only attached after the
  // app loads with VITE_CYPRESS=true. Visit once to mount the bridge, sign in,
  // then navigate to /add-recipe. Firebase persists auth in IndexedDB across
  // same-origin visits, so the second visit is authenticated.
  cy.visit('/')
  cy.login()
  cy.get('.dnav__create', { timeout: 10000 }).should('be.visible')
  cy.visit('/add-recipe')
}

describe('Add Recipe', () => {
  beforeEach(() => {
    cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { body: [] })
    cy.intercept('GET', `${api()}/api/recipes*`, { body: { recipeList: [], page: 0, filters: {}, entries_per_page: 5, total_results: 0 } })
    cy.intercept('GET', `${api()}/api/getUsername*`, { body: 'testinguser' })
    cy.intercept('POST', PARSE_URL, { fixture: 'ingredient-parse-result.json' }).as('parseIngredient')
    cy.intercept('POST', NUTRITION_URL, { fixture: 'nutrition-result.json' }).as('nutrition')
    cy.intercept('POST', ADD_RECIPE_URL, { statusCode: 201, body: { _id: 'cy-recipe-1' } }).as('addRecipe')
    // Recipe page that we land on after successful creation
    cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' })
    cy.intercept('GET', `${api()}/api/getReviews*`, { body: [] })
    cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
    cy.intercept('GET', `${api()}/api/getSavedRecipe*`, { body: null })
  })

  it('happy path — create recipe and navigate to the new recipe page (Critical #1 regression)', () => {
    loginAndVisitAddRecipe()
    fillRequiredFields()

    cy.get('.submit-btn').should('have.class', 'valid').click()
    cy.wait('@addRecipe')
    cy.url({ timeout: 10000 }).should('include', '/recipes/cy-recipe-1')
  })

  it('double-clicking submit only fires one addRecipe POST (High #2 regression)', () => {
    // Slow the recipe POST so the second click happens while the first is in flight.
    cy.intercept('POST', ADD_RECIPE_URL, (req) => {
      req.reply({ delay: 1500, statusCode: 201, body: { _id: 'cy-recipe-1' } })
    }).as('addRecipe')

    loginAndVisitAddRecipe()
    fillRequiredFields()

    cy.get('.submit-btn')
      .should('have.class', 'valid')
      .click()
      .click({ force: true })

    cy.wait('@addRecipe')
    cy.get('@addRecipe.all').should('have.length', 1)
  })

  it('shows session-expired message when server returns 401 (High #4 regression)', () => {
    cy.intercept('POST', ADD_RECIPE_URL, { statusCode: 401 }).as('addRecipe')

    loginAndVisitAddRecipe()
    fillRequiredFields()
    cy.get('.submit-btn').click()
    cy.wait('@addRecipe')

    cy.contains(/session|sign in/i, { timeout: 5000 }).should('be.visible')
    cy.url().should('include', '/add-recipe')
  })

  it('shows generic error message when server returns 500 and retains form state', () => {
    cy.intercept('POST', ADD_RECIPE_URL, { statusCode: 500 }).as('addRecipe')

    loginAndVisitAddRecipe()
    fillRequiredFields()
    cy.get('.submit-btn').click()
    cy.wait('@addRecipe')

    cy.contains('Failed to create recipe. Please try again.', { timeout: 5000 }).should('be.visible')
    cy.url().should('include', '/add-recipe')
    // Title input still shows the typed value
    cy.get('input[placeholder="Add a title to your recipe."]').should('have.value', 'Cypress Recipe')
  })

  it('recipe still creates when the nutrition fetch fails (High #4 Change 4 regression)', () => {
    cy.intercept('POST', NUTRITION_URL, { statusCode: 500 }).as('nutrition')

    loginAndVisitAddRecipe()
    fillRequiredFields()
    cy.get('.submit-btn').click()
    cy.wait('@addRecipe')
    cy.url({ timeout: 10000 }).should('include', '/recipes/cy-recipe-1')
  })

  it('ingredient typed in the input is parsed and appears in the list', () => {
    loginAndVisitAddRecipe()
    cy.get('input[placeholder="Add ingredients to your recipe."]').type('2 cups flour{enter}')
    cy.wait('@parseIngredient')
    // The IngredientItemText renders quantity + unit + ingredient name in the list.
    cy.contains('flour', { timeout: 5000 }).should('be.visible')
  })

  it('ingredient parse failure shows inline warning but still adds the ingredient (soft-fail)', () => {
    cy.intercept('POST', PARSE_URL, { statusCode: 500 }).as('parseIngredient')

    loginAndVisitAddRecipe()
    cy.get('input[placeholder="Add ingredients to your recipe."]').type('2 cups flour{enter}')
    cy.wait('@parseIngredient')

    // Warning surfaces via the IngredientsInput .error role=status banner
    cy.contains(/couldn't fetch nutrition\/image data/i, { timeout: 5000 }).should('be.visible')
    // The ingredient row is still added (parsedIngredient parsed locally; enrichment soft-failed)
    cy.get('.ingredients-container .item, .ingredients-container .ingredients-container.item')
      .should('have.length.at.least', 1)
  })

  it('removing the middle instruction re-indexes survivors sequentially (High #3 regression)', () => {
    loginAndVisitAddRecipe()
    const inputSel = 'input[placeholder="Add instruction for your recipe."]'
    cy.get(inputSel).type('Step one{enter}')
    cy.get(inputSel).type('Step two{enter}')
    cy.get(inputSel).type('Step three{enter}')

    // Now there are 3 instruction items; their displayed indices are 1, 2, 3.
    cy.get('.instructions .item .index').then(($indices) => {
      const labels = [...$indices].map((el) => el.textContent?.trim())
      expect(labels).to.deep.equal(['1', '2', '3'])
    })

    // Click the remove button on the second item. (InstructionItem renders the remove
    // control as button.instr-remove with aria-label "Remove step".)
    cy.get('.instructions .item').eq(1).find('[aria-label="Remove step"]').click({ force: true })

    // Survivors must show 1 and 2, not 1 and 3.
    cy.get('.instructions .item .index').then(($indices) => {
      const labels = [...$indices].map((el) => el.textContent?.trim())
      expect(labels).to.deep.equal(['1', '2'])
    })
    cy.contains('.instructions .item', 'Step one').should('be.visible')
    cy.contains('.instructions .item', 'Step three').should('be.visible')
    cy.contains('.instructions .item', 'Step two').should('not.exist')
  })

  // Filled-out smoke test: fills the whole form with a realistic, maximal recipe and
  // submits, asserting the outgoing payload reflects everything entered (counts, numeric
  // servings, multi-select meal types) — coverage the minimal happy path above lacks.
  it('creates a fully filled-out recipe and submits the entered values', () => {
    loginAndVisitAddRecipe()
    fillScenario(fullRecipeScenario)

    cy.get('.submit-btn').should('have.class', 'valid').click()
    cy.wait('@addRecipe').its('request.body').should(body => {
      // The submitted payload reflects what was filled in, not stale/empty state.
      expect(body.title).to.eq(fullRecipeScenario.title)
      expect(body.description).to.eq(fullRecipeScenario.description)
      expect(body.servings).to.eq(Number(fullRecipeScenario.servings))
      expect(body.ingredients).to.have.length(fullRecipeScenario.ingredients.length)
      expect(body.instructions).to.have.length(fullRecipeScenario.instructions.length)
      expect(body.mealTypes).to.have.members(fullRecipeScenario.mealTypes)
    })
    cy.url({ timeout: 10000 }).should('include', '/recipes/cy-recipe-1')
  })

  // Reordering via drag-and-drop in @hello-pangea/dnd requires simulating a specific
  // pointer-event sequence (mousedown on the handle → mousemove → mouseup) and the
  // library's sensor detection is timing-sensitive. The user explicitly authorised
  // skipping this with a documenting comment if the implementation would be flaky.
  // Intent: add three steps "Step A", "Step B", "Step C", drag "Step C" to the top,
  // assert the DOM order is C / A / B and that the index spans are re-numbered
  // 1 / 2 / 3 on the new positions.
  it.skip('drag-and-drop reorder updates the instruction order and re-indexes', () => {})
})
