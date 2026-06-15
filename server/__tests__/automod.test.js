/**
 * util/automod.gatherRecipeText — flattens a recipe payload into one blob for the
 * classifier. Pure-unit (no DB, no app).
 *
 * REGRESSION GUARD: these cases use the shapes the CLIENT ACTUALLY SENDS
 * (src/types.ts IngredientsType/InstructionsType), not hand-simplified stand-ins.
 * The earlier implementation read `ingredient`/`name` and `step.step`, which do
 * not exist on real payloads, so all ingredient + instruction text silently went
 * unmoderated. Assert the real keys make it into the blob.
 */

const { gatherRecipeText, holdRecipeForReview } = require('../util/automod')

// A parsed-ingredient row exactly as src/api/recipes.ts builds it.
const parsedIngredient = (originalIngredientString, ingredient) => ({
  parsedIngredient: {
    quantity: 2,
    unit: 'cups',
    unitPlural: 'cups',
    symbol: null,
    ingredient,
    originalIngredientString,
    minQty: 2,
    maxQty: null,
    comment: null,
  },
  ingredientData: { name: ingredient },
  id: 'ing-id',
})

describe('gatherRecipeText — real client payload shapes', () => {
  it('includes the verbatim ingredient line (parsedIngredient.originalIngredientString)', () => {
    const blob = gatherRecipeText({
      title: 'Soup',
      ingredients: [parsedIngredient('2 cups SLURWORD onions', 'onions')],
      instructions: [],
    })
    expect(blob).toContain('2 cups SLURWORD onions')
  })

  it('includes instruction step text (InstructionsType.content)', () => {
    const blob = gatherRecipeText({
      title: 'Soup',
      ingredients: [],
      instructions: [{ content: 'Stir in the SLURWORD and simmer', index: 0, id: 's1' }],
    })
    expect(blob).toContain('Stir in the SLURWORD and simmer')
  })

  it('includes section-header labels in both ingredient and instruction lists (LabelType)', () => {
    const blob = gatherRecipeText({
      title: 'Soup',
      ingredients: [{ label: 'For the SLURWORD sauce', id: 'l1' }],
      instructions: [{ label: 'SLURWORD prep steps', id: 'l2' }],
    })
    expect(blob).toContain('For the SLURWORD sauce')
    expect(blob).toContain('SLURWORD prep steps')
  })

  it('gathers a full mixed recipe (title, description, parsed ingredients, labels, steps)', () => {
    const blob = gatherRecipeText({
      title: 'Title TOK1',
      description: 'Description TOK2',
      ingredients: [
        { label: 'Section TOK3', id: 'l1' },
        parsedIngredient('1 tbsp TOK4 oil', 'oil'),
      ],
      instructions: [
        { label: 'Steps TOK5', id: 'l2' },
        { content: 'Heat TOK6 gently', index: 0, id: 's1' },
      ],
    })
    for (const tok of ['TOK1', 'TOK2', 'TOK3', 'TOK4', 'TOK5', 'TOK6']) {
      expect(blob).toContain(tok)
    }
  })

  it('still accepts the legacy/defensive shapes (string steps, ingredient/name, step.step)', () => {
    const blob = gatherRecipeText({
      title: 'T',
      ingredients: [{ ingredient: 'ING_A' }, { name: 'ING_B' }, 'ING_C'],
      instructions: ['STEP_X', { step: 'STEP_Y' }],
    })
    for (const tok of ['ING_A', 'ING_B', 'ING_C', 'STEP_X', 'STEP_Y']) {
      expect(blob).toContain(tok)
    }
  })

  it('is defensive against empty/missing arrays and null rows', () => {
    expect(gatherRecipeText({})).toBe('')
    expect(gatherRecipeText({ title: 'Only Title' })).toBe('Only Title')
    expect(
      gatherRecipeText({ title: 'T', ingredients: [null], instructions: [null] })
    ).toBe('T')
  })
})

describe('holdRecipeForReview — report-gated hold', () => {
  const VERDICT = { severity: 'medium', reason: 'openai:harassment:0.60', category: 'harassment', source: 'openai' }

  // Minimal fake Db that records calls and lets a collection's updateOne be
  // overridden (to simulate a failing report write).
  const fakeDb = (overrides = {}) => {
    const calls = { reports: [], recipes: [], auditLog: [] }
    const coll = (name) => ({
      updateOne: overrides[name]?.updateOne || (async (...args) => { calls[name].push(args); return { acknowledged: true } }),
      insertOne: overrides[name]?.insertOne || (async (...args) => { calls[name].push(args); return { acknowledged: true } }),
    })
    return { db: { collection: coll }, calls }
  }

  it('files the report, THEN hides the recipe, and returns true', async () => {
    const { db, calls } = fakeDb()
    const held = await holdRecipeForReview(db, { recipeId: 'rec-1', title: 'T', verdict: VERDICT })
    expect(held).toBe(true)
    expect(calls.reports).toHaveLength(1) // queue entry filed
    expect(calls.recipes).toHaveLength(1) // recipe hidden
    // The recipe is flipped to pending_review.
    expect(calls.recipes[0][1]).toEqual({ $set: { status: 'pending_review' } })
    expect(calls.auditLog).toHaveLength(1) // autohold audit appended
  })

  it('does NOT hide the recipe when the report write fails (fail-open) and returns false', async () => {
    const { db, calls } = fakeDb({
      reports: { updateOne: async () => { throw new Error('mongo down') } },
    })
    const held = await holdRecipeForReview(db, { recipeId: 'rec-2', title: 'T', verdict: VERDICT })
    expect(held).toBe(false)
    // Crucial invariant: a recipe is never hidden without a queue entry to clear it.
    expect(calls.recipes).toHaveLength(0)
  })
})
