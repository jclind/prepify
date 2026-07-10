/**
 * Test runner: Jest (not Vitest)
 * ──────────────────────────────
 * Server tests use Jest + supertest. Run with: npm test --prefix server
 *
 * Mock strategy
 * ─────────────
 * The route reaches Edamam via the global `fetch`, so we stub global.fetch and
 * never make a real network call. firebase-admin is auto-mocked via
 * server/__mocks__/firebase-admin.js, which accepts the fake bearer token.
 *
 * Env note
 * ────────
 * dotenv is only loaded in index.js, which tests never import — so
 * EDAMAM_APP_ID/KEY are undefined by default at test time (the route would 503).
 * The happy-path block sets them explicitly and restores afterwards.
 */

const request = require('supertest')
const app = require('../app')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

const EDAMAM_RESULT = {
  uri: 'http://www.edamam.com/recipe_abc',
  calories: 1200,
  totalWeight: 500,
  dietLabels: ['LOW_FAT'],
  healthLabels: ['VEGAN'],
  totalNutrients: {},
}

describe('POST /api/nutrition/details', () => {
  afterEach(() => {
    delete global.fetch
  })

  // ── Auth ─────────────────────────────────────────────────────────────────────

  it('rejects request with no auth token (401)', async () => {
    global.fetch = jest.fn()
    const res = await request(app)
      .post('/api/nutrition/details')
      .send({ ingr: ['2 cups flour'] })
    expect(res.status).toBe(401)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 when ingr is absent', async () => {
    global.fetch = jest.fn()
    const res = await request(app)
      .post('/api/nutrition/details')
      .set(AUTH_HEADER)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when ingr is an empty array', async () => {
    global.fetch = jest.fn()
    const res = await request(app)
      .post('/api/nutrition/details')
      .set(AUTH_HEADER)
      .send({ ingr: [] })
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when ingr contains a non-string', async () => {
    global.fetch = jest.fn()
    const res = await request(app)
      .post('/api/nutrition/details')
      .set(AUTH_HEADER)
      .send({ ingr: ['2 cups flour', 42] })
    expect(res.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // ── Misconfiguration ─────────────────────────────────────────────────────────

  it('returns 503 (not 500/200) when the Edamam keys are not configured', async () => {
    // Don't rely on the ambient env being empty (dotenv isn't loaded, but a
    // shell/CI env could still carry the keys) — explicitly unset and restore,
    // mirroring the save/restore in the configured block below.
    const ORIGINAL = {
      id: process.env.EDAMAM_APP_ID,
      key: process.env.EDAMAM_APP_KEY,
    }
    delete process.env.EDAMAM_APP_ID
    delete process.env.EDAMAM_APP_KEY
    global.fetch = jest.fn()
    try {
      const res = await request(app)
        .post('/api/nutrition/details')
        .set(AUTH_HEADER)
        .send({ ingr: ['2 cups flour'] })
      expect(res.status).toBe(503)
      expect(global.fetch).not.toHaveBeenCalled()
    } finally {
      if (ORIGINAL.id === undefined) delete process.env.EDAMAM_APP_ID
      else process.env.EDAMAM_APP_ID = ORIGINAL.id
      if (ORIGINAL.key === undefined) delete process.env.EDAMAM_APP_KEY
      else process.env.EDAMAM_APP_KEY = ORIGINAL.key
    }
  })

  // ── With keys configured ───────────────────────────────────────────────────────

  describe('with EDAMAM keys configured', () => {
    const ORIGINAL = {
      id: process.env.EDAMAM_APP_ID,
      key: process.env.EDAMAM_APP_KEY,
    }
    beforeAll(() => {
      process.env.EDAMAM_APP_ID = 'test-app-id'
      process.env.EDAMAM_APP_KEY = 'test-app-key'
    })
    afterAll(() => {
      if (ORIGINAL.id === undefined) delete process.env.EDAMAM_APP_ID
      else process.env.EDAMAM_APP_ID = ORIGINAL.id
      if (ORIGINAL.key === undefined) delete process.env.EDAMAM_APP_KEY
      else process.env.EDAMAM_APP_KEY = ORIGINAL.key
    })

    it('returns 200 with the Edamam payload on success and forwards the keys + ingredients', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => EDAMAM_RESULT,
      })

      const res = await request(app)
        .post('/api/nutrition/details')
        .set(AUTH_HEADER)
        .send({ ingr: ['2 cups flour', '1 tsp salt'] })

      expect(res.status).toBe(200)
      expect(res.body).toEqual(EDAMAM_RESULT)

      // Keys go in the query string (server-side), ingredients in the body.
      const [calledUrl, calledOpts] = global.fetch.mock.calls[0]
      expect(calledUrl).toContain('app_id=test-app-id')
      expect(calledUrl).toContain('app_key=test-app-key')
      const sentBody = JSON.parse(calledOpts.body)
      expect(sentBody.ingr).toEqual(['2 cups flour', '1 tsp salt'])
      expect(sentBody.title).toBe('recipe 1')

      // The upstream call must be bounded by a timeout so a hung Edamam endpoint
      // can't tie up the handler — assert an AbortSignal is passed.
      expect(calledOpts.signal).toBeInstanceOf(AbortSignal)
    })

    it('forwards a caller-supplied title instead of the default', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => EDAMAM_RESULT,
      })

      await request(app)
        .post('/api/nutrition/details')
        .set(AUTH_HEADER)
        .send({ ingr: ['2 cups flour'], title: 'Grandma Pie' })

      const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(sentBody.title).toBe('Grandma Pie')
    })

    it('returns a generic 500 when the upstream call times out (AbortError)', async () => {
      // AbortSignal.timeout(...) rejects the fetch with an AbortError, which must
      // land in the same catch as any other failure → 500 → client soft-fails.
      global.fetch = jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
        )

      const res = await request(app)
        .post('/api/nutrition/details')
        .set(AUTH_HEADER)
        .send({ ingr: ['2 cups flour'] })

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error', 'Internal server error')
    })

    // Any upstream non-2xx — "no nutrition" (404/555), rate limit (429), or a
    // genuine Edamam 500 — soft-fails the same way (pins nutrition.js:69-72).
    it.each([404, 429, 500, 555])(
      'soft-fails to 200/null when Edamam responds %i',
      async (status) => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status,
          json: async () => ({}),
        })

        const res = await request(app)
          .post('/api/nutrition/details')
          .set(AUTH_HEADER)
          .send({ ingr: ['asdf'] })

        // 200 + null keeps the client's null-guard happy and avoids a false 5xx
        // Sentry alert for a routine "couldn't compute" answer.
        expect(res.status).toBe(200)
        expect(res.body).toBeNull()
      }
    )

    it('returns a generic 500 (not the raw error) when the fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network exploded'))

      const res = await request(app)
        .post('/api/nutrition/details')
        .set(AUTH_HEADER)
        .send({ ingr: ['2 cups flour'] })

      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error', 'Internal server error')
    })
  })
})
