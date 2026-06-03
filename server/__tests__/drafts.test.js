/**
 * Auth approach mirrors recipes.test.js: server/__mocks__/firebase-admin.js
 * makes verifyIdToken always resolve to { uid: 'test-uid' }, so any request
 * with an Authorization header passes verifyToken with req.uid = 'test-uid'.
 *
 * Ownership tests seed a draft owned by a *different* uid directly in the DB,
 * then confirm the 'test-uid' caller is forbidden from reading/writing it.
 */

const request = require('supertest')
const { ObjectId } = require('mongodb')
const app = require('../app')
const { getDB } = require('../db')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

afterEach(async () => {
  await getDB().collection('recipeDrafts').deleteMany({})
})

async function seedDraft(overrides = {}) {
  const now = Date.now().toString()
  const doc = {
    _id: new ObjectId(),
    userId: TEST_UID,
    title: 'Draft title',
    ingredients: [],
    instructions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
  await getDB().collection('recipeDrafts').insertOne(doc)
  return doc
}

describe('POST /api/drafts', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/drafts').send({ title: 'x' })
    expect(res.status).toBe(401)
  })

  it('creates a draft owned by the caller and returns it', async () => {
    const res = await request(app)
      .post('/api/drafts')
      .set(AUTH_HEADER)
      .send({ title: 'WIP recipe', cuisine: 'Italian' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('WIP recipe')
    expect(res.body.cuisine).toBe('Italian')
    expect(res.body.userId).toBe(TEST_UID)
    expect(res.body._id).toBeDefined()
    expect(res.body.createdAt).toBeDefined()
    expect(res.body.updatedAt).toBeDefined()
  })

  it('ignores client-supplied userId / _id', async () => {
    const res = await request(app)
      .post('/api/drafts')
      .set(AUTH_HEADER)
      .send({ title: 'x', userId: 'someone-else', _id: 'forced-id' })
    expect(res.status).toBe(201)
    expect(res.body.userId).toBe(TEST_UID)
    expect(res.body._id).not.toBe('forced-id')
  })

  it('rejects content that exceeds bounds', async () => {
    const res = await request(app)
      .post('/api/drafts')
      .set(AUTH_HEADER)
      .send({ title: 'a'.repeat(51) })
    expect(res.status).toBe(400)
  })

  it('allows an empty/partial draft (no required fields)', async () => {
    const res = await request(app).post('/api/drafts').set(AUTH_HEADER).send({})
    expect(res.status).toBe(201)
  })

  it('rejects creation past the per-user cap with 409 + DRAFT_LIMIT, counting only the caller', async () => {
    // Fill the caller to the cap, plus some drafts owned by someone else that
    // must not count toward this user's limit.
    const now = Date.now().toString()
    const mine = Array.from({ length: 25 }, (_, i) => ({
      _id: new ObjectId(),
      userId: TEST_UID,
      title: `draft ${i}`,
      createdAt: now,
      updatedAt: now,
    }))
    const theirs = Array.from({ length: 5 }, () => ({
      _id: new ObjectId(),
      userId: 'other-uid',
      createdAt: now,
      updatedAt: now,
    }))
    await getDB().collection('recipeDrafts').insertMany([...mine, ...theirs])

    const res = await request(app)
      .post('/api/drafts')
      .set(AUTH_HEADER)
      .send({ title: 'one too many' })
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('DRAFT_LIMIT')
  })

  it('still allows editing an existing draft when at the cap', async () => {
    const now = Date.now().toString()
    const mine = Array.from({ length: 25 }, (_, i) => ({
      _id: new ObjectId(),
      userId: TEST_UID,
      title: `draft ${i}`,
      createdAt: now,
      updatedAt: now,
    }))
    await getDB().collection('recipeDrafts').insertMany(mine)

    const res = await request(app)
      .put(`/api/drafts/${mine[0]._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'edited at cap' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('edited at cap')
  })
})

describe('GET /api/drafts', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/drafts')
    expect(res.status).toBe(401)
  })

  it("returns only the caller's drafts, newest-updated first", async () => {
    await seedDraft({ title: 'older', updatedAt: '1000' })
    await seedDraft({ title: 'newer', updatedAt: '2000' })
    await seedDraft({ title: 'theirs', userId: 'other-uid' })

    const res = await request(app).get('/api/drafts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body.map(d => d.title)).toEqual(['newer', 'older'])
  })
})

describe('GET /api/drafts/:id', () => {
  it('returns the draft for its owner', async () => {
    const draft = await seedDraft({ title: 'mine' })
    const res = await request(app)
      .get(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('mine')
  })

  it("forbids reading another user's draft", async () => {
    const draft = await seedDraft({ userId: 'other-uid' })
    const res = await request(app)
      .get(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('404s for a missing or malformed id', async () => {
    const missing = await request(app)
      .get(`/api/drafts/${new ObjectId()}`)
      .set(AUTH_HEADER)
    expect(missing.status).toBe(404)
    const malformed = await request(app)
      .get('/api/drafts/not-an-id')
      .set(AUTH_HEADER)
    expect(malformed.status).toBe(404)
  })
})

describe('PUT /api/drafts/:id', () => {
  it('updates content and bumps updatedAt', async () => {
    const draft = await seedDraft({ title: 'before', updatedAt: '1000' })
    const res = await request(app)
      .put(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'after', servings: 4 })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('after')
    expect(res.body.servings).toBe(4)
    expect(Number(res.body.updatedAt)).toBeGreaterThan(1000)
  })

  it("forbids updating another user's draft", async () => {
    const draft = await seedDraft({ userId: 'other-uid' })
    const res = await request(app)
      .put(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'hijacked' })
    expect(res.status).toBe(403)
  })

  it('does not change userId/createdAt even if sent', async () => {
    const draft = await seedDraft({ createdAt: '500' })
    const res = await request(app)
      .put(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'x', userId: 'other-uid', createdAt: '999' })
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe(TEST_UID)
    expect(res.body.createdAt).toBe('500')
  })

  it('rejects content that exceeds bounds', async () => {
    const draft = await seedDraft()
    const res = await request(app)
      .put(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'a'.repeat(51) })
    expect(res.status).toBe(400)
  })

  it("checks ownership before bounds (403, not 400, for another user's draft)", async () => {
    const draft = await seedDraft({ userId: 'other-uid' })
    const res = await request(app)
      .put(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
      .send({ title: 'a'.repeat(51) })
    expect(res.status).toBe(403)
  })

  it('checks existence before bounds (404, not 400, for a missing draft)', async () => {
    const res = await request(app)
      .put(`/api/drafts/${new ObjectId()}`)
      .set(AUTH_HEADER)
      .send({ title: 'a'.repeat(51) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/drafts/:id', () => {
  it('deletes the draft for its owner', async () => {
    const draft = await seedDraft()
    const res = await request(app)
      .delete(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const remaining = await getDB()
      .collection('recipeDrafts')
      .findOne({ _id: draft._id })
    expect(remaining).toBeNull()
  })

  it("forbids deleting another user's draft", async () => {
    const draft = await seedDraft({ userId: 'other-uid' })
    const res = await request(app)
      .delete(`/api/drafts/${draft._id}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })
})
