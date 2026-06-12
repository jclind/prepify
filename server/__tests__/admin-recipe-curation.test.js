/**
 * P2 recipe curation: admin feature + de-publish. `unpublished` is filtered from
 * public reads exactly like a moderation `hidden`, but stamps a distinct field
 * (publishUpdatedBy, not moderatedBy). `featured` recipes pin to the front of
 * the trending row.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedRecipes } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'
const BASE = { title: 'Dish', views: 0, rating: { rateCount: 0, rateValue: 0 } }

afterEach(async () => {
  admin.__resetClaims()
  await getDB().collection('recipes').deleteMany({})
})

describe('PATCH /api/admin/recipes/:id/publish', () => {
  it('requires admin', async () => {
    await seedRecipe({ ...BASE, _id: 'r1' })
    const res = await request(app)
      .patch('/api/admin/recipes/r1/publish')
      .set(AUTH_HEADER)
      .send({ published: false })
    expect(res.status).toBe(403)
  })

  it('de-publishes and re-publishes, stamping publishUpdatedBy (not moderatedBy)', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE, _id: 'r1', userId: 'someone' })

    const unpub = await request(app)
      .patch('/api/admin/recipes/r1/publish')
      .set(AUTH_HEADER)
      .send({ published: false })
    expect(unpub.status).toBe(200)
    let doc = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(doc.status).toBe('unpublished')
    expect(doc.publishUpdatedBy).toBe(TEST_UID)
    expect(doc.moderatedBy).toBeUndefined() // not a moderation takedown

    const pub = await request(app)
      .patch('/api/admin/recipes/r1/publish')
      .set(AUTH_HEADER)
      .send({ published: true })
    expect(pub.status).toBe(200)
    doc = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(doc.status).toBe('active')
  })

  it('rejects a non-boolean published value', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE, _id: 'r1' })
    const res = await request(app)
      .patch('/api/admin/recipes/r1/publish')
      .set(AUTH_HEADER)
      .send({ published: 'no' })
    expect(res.status).toBe(400)
  })
})

describe('unpublished recipes are filtered from public reads', () => {
  it('GET /recipes and /getRecipe exclude an unpublished recipe', async () => {
    await seedRecipes([
      { ...BASE, _id: 'vis', title: 'Visible' },
      { ...BASE, _id: 'unp', title: 'Unpub', status: 'unpublished' },
    ])
    const list = await request(app).get('/api/recipes?recipesPerPage=50')
    const ids = list.body.recipeList.map((r) => r._id)
    expect(ids).toContain('vis')
    expect(ids).not.toContain('unp')

    const single = await request(app).get('/api/getRecipe?id=unp')
    expect(single.status).toBe(404)
  })

  it('lets an admin still load a hidden/unpublished recipe, without inflating views', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE, _id: 'unp', status: 'unpublished', views: 7 })
    const res = await request(app).get('/api/getRecipe?id=unp').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe('unp')
    const doc = await getDB().collection('recipes').findOne({ _id: 'unp' })
    expect(doc.views).toBe(7) // moderation preview doesn't count as a visit
  })
})

describe('PATCH /api/admin/recipes/:id/feature', () => {
  it('sets the featured flag', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE, _id: 'r1' })
    const res = await request(app)
      .patch('/api/admin/recipes/r1/feature')
      .set(AUTH_HEADER)
      .send({ featured: true })
    expect(res.status).toBe(200)
    expect(res.body.featured).toBe(true)
    const doc = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(doc.featured).toBe(true)
    expect(doc.featuredBy).toBe(TEST_UID)
  })

  it('pins featured recipes to the front of trending, above higher-view ones', async () => {
    await seedRecipes([
      { ...BASE, _id: 'popular', title: 'Popular', views: 100 },
      { ...BASE, _id: 'pick', title: 'Pick', views: 1, featured: true },
    ])
    const res = await request(app).get('/api/getTrendingRecipes?limit=4')
    expect(res.body[0]._id).toBe('pick')
  })
})
