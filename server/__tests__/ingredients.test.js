/**
 * Test runner: Jest (not Vitest)
 * ──────────────────────────────
 * The server test suite uses Jest + supertest. The root Vitest config
 * explicitly excludes server tests via include: ['src/**\/*.test.{ts,tsx}'].
 * Run this file with: npm test --prefix server
 *
 * Mock strategy
 * ─────────────
 * @jclind/ingredient-parser is mocked inline so tests never make real HTTP
 * calls to the Spoonacular API. The jest.mock() call is hoisted by Jest above
 * all require() statements, so the route module picks up the mock when it is
 * first loaded through require('../app').
 *
 * firebase-admin is automatically mocked via server/__mocks__/firebase-admin.js.
 *
 * SPOONACULAR_API_KEY note
 * ────────────────────────
 * dotenv is loaded only in index.js, which tests never import. Therefore
 * process.env.SPOONACULAR_API_KEY is undefined at test time. Because
 * ingredientParser is mocked this has no effect on test correctness, but the
 * args-forwarding test documents this as current behaviour.
 */

jest.mock('@jclind/ingredient-parser', () => ({
  ingredientParser: jest.fn(),
}))

const request = require('supertest')
const app = require('../app')
const { ingredientParser } = require('@jclind/ingredient-parser')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// Minimal valid IngredientResponse shape (mirrors the package's TypeScript types)
const PARSED_RESULT = {
  parsedIngredient: {
    quantity: 2,
    unit: 'cup',
    unitPlural: 'cups',
    symbol: null,
    ingredient: 'flour',
    originalIngredientString: '2 cups flour',
    minQty: 2,
    maxQty: 2,
    comment: null,
  },
  ingredientData: { name: 'flour', id: 1234 },
}

// ─── POST /api/ingredients/parse ─────────────────────────────────────────────

describe('POST /api/ingredients/parse', () => {
  beforeEach(() => {
    ingredientParser.mockReset()
    ingredientParser.mockResolvedValue(PARSED_RESULT)
  })

  // ── Auth ─────────────────────────────────────────────────────────────────────

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .send({ ingredientString: '2 cups flour' })
    expect(res.status).toBe(401)
    expect(ingredientParser).not.toHaveBeenCalled()
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when ingredientString is absent from the body', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(ingredientParser).not.toHaveBeenCalled()
  })

  it('returns 400 when ingredientString is an empty string', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(ingredientParser).not.toHaveBeenCalled()
  })

  it('returns 400 when ingredientString is not a string (number)', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: 42 })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(ingredientParser).not.toHaveBeenCalled()
  })

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('returns 200 with the full parser result for a valid ingredientString', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(PARSED_RESULT)
  })

  it('response body contains parsedIngredient with the expected shape', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    const { parsedIngredient } = res.body
    expect(parsedIngredient).toHaveProperty('ingredient', 'flour')
    expect(parsedIngredient).toHaveProperty('quantity', 2)
    expect(parsedIngredient).toHaveProperty('unit', 'cup')
    expect(parsedIngredient).toHaveProperty('originalIngredientString', '2 cups flour')
    expect(parsedIngredient).toHaveProperty('minQty')
    expect(parsedIngredient).toHaveProperty('maxQty')
  })

  it('forwards options from the request body to ingredientParser', async () => {
    const options = { servings: 4 }
    await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour', options })
    // SPOONACULAR_API_KEY is process.env.SPOONACULAR_API_KEY (undefined in test
    // env — dotenv is not loaded when tests import app.js directly).
    expect(ingredientParser).toHaveBeenCalledWith(
      '2 cups flour',
      process.env.SPOONACULAR_API_KEY,
      options
    )
  })

  // ── Error handling ────────────────────────────────────────────────────────────

  it('returns 500 and the error message when ingredientParser throws', async () => {
    ingredientParser.mockRejectedValue(new Error('parser exploded'))
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error', 'parser exploded')
  })
})
