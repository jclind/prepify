/**
 * Test runner: Jest (not Vitest)
 * ──────────────────────────────
 * The server test suite uses Jest + supertest. The root Vitest config
 * explicitly excludes server tests via include: ['src/**\/*.test.{ts,tsx}'].
 * Run this file with: npm test --prefix server
 *
 * Mock strategy
 * ─────────────
 * @jclind/ingredient-parser v2 is mocked inline so tests never make real HTTP
 * calls to the enrichment proxy. The jest.mock() call is hoisted by Jest above
 * all require() statements, so the route module picks up the mock when it is
 * first loaded through require('../app').
 *
 * firebase-admin is automatically mocked via server/__mocks__/firebase-admin.js.
 *
 * v2 contract
 * ───────────
 * ingredientParser(input, options) resolves to { parsed, data }. `data` is the
 * vendor-neutral IngredientData (or null on a clean miss); it carries `image`
 * (full CDN URL) and `price: { cents, ... } | null`. The route projects that
 * onto Prepify's stable shape ({ imagePath, totalPriceUSACents, ... }) and
 * rewrites the CDN host. No Spoonacular API key is passed — the proxy holds it.
 */

jest.mock('@jclind/ingredient-parser', () => ({
  ingredientParser: jest.fn(),
}))

const request = require('supertest')
const app = require('../app')
const { ingredientParser } = require('@jclind/ingredient-parser')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// A representative v2 ingredientParser result (mirrors the real runtime shape).
const V2_RESULT = {
  parsed: {
    quantity: { value: 2, min: 2, max: 2, isRange: false, isApproximate: false },
    unit: { name: 'cup', plural: 'cups', symbol: 'c', type: 'volume', system: 'us' },
    ingredient: { name: 'flour', descriptors: [], preparation: [] },
    comment: null,
    original: '2 cups flour',
  },
  data: {
    name: 'all-purpose flour',
    category: 'Baking',
    image: 'https://spoonacular.com/cdn/ingredients_100x100/flour.png',
    possibleUnits: ['g', 'oz', 'cup'],
    nutrition: null,
    // v2 prices are gram-estimated floats; the route rounds to whole cents.
    price: { cents: 32.6, basis: 'gram', grams: 250, perGramCents: 0.13, confidence: 'low' },
  },
}

// ─── POST /api/ingredients/parse ─────────────────────────────────────────────

describe('POST /api/ingredients/parse', () => {
  beforeEach(() => {
    ingredientParser.mockReset()
    ingredientParser.mockResolvedValue(V2_RESULT)
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

  // ── Happy path / mapping ──────────────────────────────────────────────────────

  it('returns 200 with the v2 result mapped onto Prepify\'s stable shape', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ingredientData: {
        name: 'all-purpose flour',
        category: 'Baking',
        imagePath: 'https://img.spoonacular.com/ingredients_100x100/flour.png',
        possibleUnits: ['g', 'oz', 'cup'],
        totalPriceUSACents: 33,
      },
    })
  })

  it('rounds the v2 float price to whole cents (32.6 → 33)', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.body.ingredientData.totalPriceUSACents).toBe(33)
  })

  it('calls ingredientParser with no API key (v2 is key-free; proxy holds it)', async () => {
    await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(ingredientParser).toHaveBeenCalledWith('2 cups flour', {
      imageSize: '100x100',
    })
  })

  it('ignores client-supplied options so a caller cannot redirect the proxy', async () => {
    await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({
        ingredientString: '2 cups flour',
        options: { serverUrl: 'https://evil.example.com' },
      })
    // The route forwards only its own server-controlled options — never the
    // client's. serverUrl from the body must not reach the parser.
    expect(ingredientParser).toHaveBeenCalledWith('2 cups flour', {
      imageSize: '100x100',
    })
  })

  // ── CDN host rewrite ──────────────────────────────────────────────────────────

  it('rewrites spoonacular.com/cdn → img.spoonacular.com on the image URL', async () => {
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.body.ingredientData.imagePath).toBe(
      'https://img.spoonacular.com/ingredients_100x100/flour.png'
    )
  })

  it('preserves the configurable image-size segment (e.g., 250x250)', async () => {
    ingredientParser.mockResolvedValue({
      ...V2_RESULT,
      data: {
        ...V2_RESULT.data,
        image: 'https://spoonacular.com/cdn/ingredients_250x250/garlic.png',
      },
    })
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cloves garlic' })
    expect(res.body.ingredientData.imagePath).toBe(
      'https://img.spoonacular.com/ingredients_250x250/garlic.png'
    )
  })

  // ── Partial enrichment (found, but no price/image) ──────────────────────────────

  it('omits totalPriceUSACents when the ingredient has no price', async () => {
    ingredientParser.mockResolvedValue({
      ...V2_RESULT,
      data: { ...V2_RESULT.data, price: null },
    })
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: 'pinch of salt' })
    expect(res.status).toBe(200)
    expect(res.body.ingredientData).not.toHaveProperty('totalPriceUSACents')
    expect(res.body.ingredientData.name).toBe('all-purpose flour')
  })

  it('omits imagePath when the ingredient has no image', async () => {
    ingredientParser.mockResolvedValue({
      ...V2_RESULT,
      data: { ...V2_RESULT.data, image: null },
    })
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.body.ingredientData).not.toHaveProperty('imagePath')
  })

  // ── Clean miss / error handling ────────────────────────────────────────────────

  it('returns 200 with ingredientData: null on a clean lookup miss (data: null)', async () => {
    ingredientParser.mockResolvedValue({ parsed: V2_RESULT.parsed, data: null })
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: 'zzqxnonexistent' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ingredientData: null })
  })

  it('returns a generic 500 (not the raw error) when ingredientParser throws', async () => {
    ingredientParser.mockRejectedValue(new Error('proxy exploded'))
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '2 cups flour' })
    expect(res.status).toBe(500)
    // Body is generic; the real message ('proxy exploded') is logged, not echoed.
    expect(res.body).toHaveProperty('error', 'Internal server error')
  })
})
