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

const { gatherRecipeText, holdRecipeForReview, auditContentBlock, respondBlocked } = require('../util/automod')
const { SYSTEM_ACTOR } = require('../util/auditLog')

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

  it('stamps the numeric classifier score (0–1) onto the filed report', async () => {
    const { db, calls } = fakeDb()
    await holdRecipeForReview(db, {
      recipeId: 'rec-score',
      title: 'T',
      verdict: { ...VERDICT, score: 0.6 },
    })
    const setOnInsert = calls.reports[0][1].$setOnInsert
    expect(setOnInsert.classifier.score).toBe(0.6)
  })

  it('stores classifier.score as null when the verdict carries no numeric score', async () => {
    const { db, calls } = fakeDb()
    await holdRecipeForReview(db, {
      recipeId: 'rec-noscore',
      title: 'T',
      verdict: { severity: 'medium', reason: 'vision:adult:LIKELY', category: 'adult', source: 'vision' },
    })
    const setOnInsert = calls.reports[0][1].$setOnInsert
    expect(setOnInsert.classifier.score).toBeNull()
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

describe('auditContentBlock — system-actor trail for a refused write', () => {
  // Fake Db capturing the auditLog insert and serving a usernames lookup.
  const fakeDb = ({ username, findThrows, insertThrows } = {}) => {
    const inserts = []
    return {
      inserts,
      db: {
        collection: (name) => {
          if (name === 'usernames') {
            return {
              findOne: async () => {
                if (findThrows) throw new Error('lookup down')
                return username ? { username } : null
              },
            }
          }
          return {
            insertOne: async (doc) => {
              if (insertThrows) throw new Error('insert down')
              inserts.push(doc)
              return { acknowledged: true }
            },
          }
        },
      },
    }
  }

  const VERDICT = { allowed: false, severity: 'high', reason: 'blocklist:slur:SLURWORD', category: 'slur', source: 'blocklist' }

  it('writes a system-actor content.blocked row targeting the offending user', async () => {
    const { db, inserts } = fakeDb({ username: 'baduser' })
    await auditContentBlock(db, { uid: 'uid-1', surface: 'review', verdict: VERDICT })
    expect(inserts).toHaveLength(1)
    const row = inserts[0]
    expect(row.action).toBe('content.blocked')
    expect(row.actorUid).toBe(SYSTEM_ACTOR.uid)
    expect(row.actorType).toBe('system')
    expect(row.targetType).toBe('user')
    expect(row.targetId).toBe('uid-1')
    expect(row.targetLabel).toBe('@baduser')
    expect(row.metadata).toEqual({
      surface: 'review',
      category: 'slur',
      severity: 'high',
      source: 'blocklist',
    })
  })

  it('stores NO raw content — never the verdict.reason (which embeds the matched term) or the text', async () => {
    const { db, inserts } = fakeDb({ username: 'baduser' })
    await auditContentBlock(db, { uid: 'uid-1', surface: 'username', verdict: VERDICT })
    const serialized = JSON.stringify(inserts[0])
    expect(serialized).not.toContain('SLURWORD') // the matched term must not leak
    expect(serialized).not.toContain('blocklist:slur:') // nor the reason string that carries it
    expect(inserts[0].reason).toBeFalsy()
  })

  it('falls back to a null targetLabel (→ bare uid at render) when the username lookup misses', async () => {
    const { db, inserts } = fakeDb({ username: null })
    await auditContentBlock(db, { uid: 'uid-2', surface: 'profile', verdict: VERDICT })
    expect(inserts[0].targetLabel).toBeNull()
    expect(inserts[0].targetId).toBe('uid-2')
  })

  it('is best-effort: a username-lookup failure still records the row', async () => {
    const { db, inserts } = fakeDb({ findThrows: true })
    await expect(
      auditContentBlock(db, { uid: 'uid-3', surface: 'recipe', verdict: VERDICT })
    ).resolves.toBeUndefined()
    expect(inserts).toHaveLength(1)
    expect(inserts[0].targetLabel).toBeNull()
  })

  it('is best-effort: an audit-insert failure never throws', async () => {
    const { db } = fakeDb({ username: 'baduser', insertThrows: true })
    await expect(
      auditContentBlock(db, { uid: 'uid-4', surface: 'recipe', verdict: VERDICT })
    ).resolves.toBeUndefined()
  })

  it('no-ops when given no db', async () => {
    await expect(auditContentBlock(undefined, { uid: 'x' })).resolves.toBeUndefined()
  })
})

describe('respondBlocked — 422 contract + best-effort audit', () => {
  const fakeRes = () => {
    const res = {}
    res.status = jest.fn(() => res)
    res.json = jest.fn(() => res)
    return res
  }

  // The no-context path warns (a wiring bug); spy so it doesn't spam test output
  // and so the warn-behaviour test can assert on it.
  let warnSpy
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns the 422 CONTENT_BLOCKED contract', () => {
    const res = fakeRes()
    respondBlocked(res)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONTENT_BLOCKED' })
    )
  })

  it('drops a content.blocked audit row when context is supplied, without blocking the response', async () => {
    const inserts = []
    const db = {
      collection: (name) =>
        name === 'usernames'
          ? { findOne: async () => ({ username: 'baduser' }) }
          : { insertOne: async (doc) => { inserts.push(doc); return { acknowledged: true } } },
    }
    const res = fakeRes()
    respondBlocked(res, { db, uid: 'uid-9', surface: 'displayName', verdict: { severity: 'high', category: 'harassment', source: 'openai' } })
    // Response is sent synchronously; the audit is fire-and-forget.
    expect(res.status).toHaveBeenCalledWith(422)
    await new Promise((r) => setImmediate(r)) // let the fire-and-forget settle
    expect(inserts).toHaveLength(1)
    expect(inserts[0].action).toBe('content.blocked')
    expect(inserts[0].metadata.surface).toBe('displayName')
  })

  it('warns loudly (does not silently skip the audit) and never throws when no context is passed', () => {
    const res = fakeRes()
    expect(() => respondBlocked(res)).not.toThrow()
    expect(res.status).toHaveBeenCalledWith(422)
    // A block with no audit context is a wiring bug — it must be loud, not silent.
    expect(warnSpy).toHaveBeenCalled()
  })
})
