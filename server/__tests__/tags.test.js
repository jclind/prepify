const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { seedTags } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

afterEach(async () => {
  await getDB().collection('tags').deleteMany({})
})

// ─── POST /addRecipeTag ───────────────────────────────────────────────────────

describe('POST /addRecipeTag', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/addRecipeTag')
      .send({ text: 'vegan' })
    expect(res.status).toBe(401)
  })

  it('inserts a tag and returns the document with _id', async () => {
    const res = await request(app)
      .post('/addRecipeTag')
      .set(AUTH_HEADER)
      .send({ text: 'vegan' })

    expect(res.status).toBe(200)
    expect(res.body.text).toBe('vegan')
    expect(res.body).toHaveProperty('_id')
  })
})

// ─── GET /searchRecipeTags ────────────────────────────────────────────────────

describe('GET /searchRecipeTags', () => {
  beforeEach(async () => {
    await seedTags(['vegan', 'vegetarian', 'gluten-free', 'dairy-free'])
  })

  it('returns all tags when no query is given', async () => {
    const res = await request(app).get('/searchRecipeTags')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
  })

  it('returns tags matching the search query (case-insensitive)', async () => {
    const res = await request(app).get('/searchRecipeTags?q=VEG')
    expect(res.status).toBe(200)
    const texts = res.body.map((t) => t.text)
    expect(texts).toContain('vegan')
    expect(texts).toContain('vegetarian')
    expect(texts).not.toContain('gluten-free')
  })

  it('excludes tags listed in selectedTags', async () => {
    const res = await request(app).get('/searchRecipeTags?selectedTags=vegan,gluten-free')
    expect(res.status).toBe(200)
    const texts = res.body.map((t) => t.text)
    expect(texts).not.toContain('vegan')
    expect(texts).not.toContain('gluten-free')
    expect(texts).toContain('vegetarian')
    expect(texts).toContain('dairy-free')
  })

  it('limits results to 10', async () => {
    await getDB()
      .collection('tags')
      .insertMany(Array.from({ length: 12 }, (_, i) => ({ text: `tag-${i}` })))

    const res = await request(app).get('/searchRecipeTags')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(10)
  })
})

// ─── GET /getRecipeTags ───────────────────────────────────────────────────────

describe('GET /getRecipeTags', () => {
  beforeEach(async () => {
    await seedTags(['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'low-carb'])
  })

  it('returns 5 tags by default', async () => {
    const res = await request(app).get('/getRecipeTags')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(5)
  })

  it('respects the limit query param', async () => {
    const res = await request(app).get('/getRecipeTags?limit=3')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
  })
})
