/**
 * Unit coverage for util/recipeLimits.js validateRequiredRecipeFields.
 *
 * Pins the defence-in-depth half of the whitespace-only-title fix: a required
 * string field that is present but blank once trimmed (e.g. an all-spaces
 * title) must be reported as missing, so the server can't persist a
 * blank-looking required field even if a client skips the trimmed-title guard.
 * The route-level "Missing required fields" 400s in recipes.test.js exercise
 * the wiring; these lock the predicate at the util level.
 */
const {
  validateRequiredRecipeFields,
  normalizeRecipeInput,
} = require('../util/recipeLimits')

const validBody = () => ({
  title: 'My Great Recipe',
  ingredients: [{ parsedIngredient: {} }],
  instructions: [{ content: 'Mix' }],
  mealTypes: ['dinner'],
})

describe('validateRequiredRecipeFields', () => {
  it('accepts a fully-populated body', () => {
    expect(validateRequiredRecipeFields(validBody())).toBeNull()
  })

  it('treats a whitespace-only required string as missing', () => {
    const err = validateRequiredRecipeFields({ ...validBody(), title: '     ' })
    expect(err).toMatch(/Missing required fields/)
    expect(err).toContain('title')
  })

  it('still accepts a title with surrounding whitespace', () => {
    expect(
      validateRequiredRecipeFields({ ...validBody(), title: '  Soup  ' })
    ).toBeNull()
  })

  it('reports genuinely missing/empty fields', () => {
    const err = validateRequiredRecipeFields({
      title: '',
      ingredients: [],
      instructions: null,
      mealTypes: [],
    })
    expect(err).toMatch(/Missing required fields/)
    for (const f of ['title', 'ingredients', 'instructions', 'mealTypes']) {
      expect(err).toContain(f)
    }
  })
})

describe('normalizeRecipeInput', () => {
  it('trims surrounding whitespace off the title in place', () => {
    const body = { ...validBody(), title: '  Soup  ' }
    const returned = normalizeRecipeInput(body)
    expect(body.title).toBe('Soup')
    // Mutates and returns the same object for convenient chaining.
    expect(returned).toBe(body)
  })

  it('leaves an already-clean title untouched', () => {
    const body = { ...validBody(), title: 'Soup' }
    normalizeRecipeInput(body)
    expect(body.title).toBe('Soup')
  })

  it('does not throw on a non-string title', () => {
    const body = { ...validBody(), title: 123 }
    expect(() => normalizeRecipeInput(body)).not.toThrow()
    expect(body.title).toBe(123)
  })
})
