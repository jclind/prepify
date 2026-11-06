/**
 * Review fix 1d (AC-6, CR-9) — bound two public, unauthenticated reads.
 *
 * - searchAutoCompleteRecipes ran a regex, a $text query and a Levenshtein pass
 *   over up to 1000 titles for a query of any length. A query longer than the
 *   longest allowed title can't match anything, so it now gets a 400 first.
 * - getTrendingRecipes capped `limit` from above only. A negative limit reached
 *   Mongo, which reads it as "one batch of that many", so ?limit=-1000 returned
 *   up to 1000 recipes. It needs more seeded recipes than the cap to show.
 */
const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipes } = require('./helpers/seed')
const { TITLE_MAX_LENGTH } = require('../util/recipeLimits')

afterEach(async () => {
  await getDB().collection('recipes').deleteMany({})
})

describe('GET /searchAutoCompleteRecipes — query length cap', () => {
  beforeEach(() => seedRecipes([{ _id: 'a', title: 'Chicken Soup', views: 1 }]))

  it('400s a query longer than the longest allowed title', async () => {
    const res = await request(app)
      .get('/api/searchAutoCompleteRecipes')
      .query({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) })
    expect(res.status).toBe(400)
  })

  it('still answers a query at the cap', async () => {
    const res = await request(app)
      .get('/api/searchAutoCompleteRecipes')
      .query({ title: 'chicken'.padEnd(TITLE_MAX_LENGTH, ' s') })
    expect(res.status).toBe(200)
  })
})

describe('GET /getTrendingRecipes — limit clamp', () => {
  beforeEach(() =>
    seedRecipes(Array.from({ length: 25 }, (_, i) => ({ _id: `t${i}`, title: `Dish ${i}`, views: i })))
  )

  const trending = (limit) => request(app).get('/api/getTrendingRecipes').query({ limit })

  it.each([
    ['-1000', 1],
    ['-1', 1],
    ['0', 4],
    ['abc', 4],
    ['7', 7],
    ['500', 20],
  ])('limit=%s returns %i recipes', async (limit, expected) => {
    const res = await trending(limit)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(expected)
  })
})
