/**
 * Admin user management: search/list + detail + status changes, including the
 * self- and admin-target guards. Status defaults to 'active' for any user
 * without a `users` record (legacy-safe).
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedUser, seedRating } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

afterEach(async () => {
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('users').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('reports').deleteMany({}),
  ])
})

describe('GET /api/admin/users', () => {
  it('requires admin', async () => {
    const res = await request(app).get('/api/admin/users').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('searches by username prefix and enriches with counts + default status', async () => {
    admin.__setClaims({ admin: true })
    await seedUser('u1', 'alice')
    await seedUser('u2', 'alicia')
    await seedUser('u3', 'bob')
    await seedRecipe({ _id: 'r1', userId: 'u1', title: 'A' })
    await seedRecipe({ _id: 'r2', userId: 'u1', title: 'B' })
    await seedRating({ username: 'alice', recipeId: 'r9', rating: 5, reviewText: 'x' })
    await getDB().collection('reports').insertOne({
      targetType: 'review', recipeId: 'r9', reportedUsername: 'alice', status: 'open',
    })

    const res = await request(app).get('/api/admin/users?query=ali').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const names = res.body.users.map((u) => u.username).sort()
    expect(names).toEqual(['alice', 'alicia'])
    expect(res.body.totalCount).toBe(2)

    const alice = res.body.users.find((u) => u.username === 'alice')
    expect(alice.status).toBe('active') // no users record
    expect(alice.counts).toEqual({ recipes: 2, reviews: 1, openReports: 1 })
  })

  it('counts written reviews only, not bare star ratings', async () => {
    admin.__setClaims({ admin: true })
    await seedUser('u1', 'rater')
    await seedRating({ username: 'rater', recipeId: 'r1', rating: 5, reviewText: 'great' })
    await seedRating({ username: 'rater', recipeId: 'r2', rating: 4, reviewText: '' }) // star-only
    const res = await request(app).get('/api/admin/users?query=rater').set(AUTH_HEADER)
    expect(res.body.users[0].counts.reviews).toBe(1)
  })

  it('counts an open recipe report against the recipe author', async () => {
    admin.__setClaims({ admin: true })
    await seedUser('u1', 'chef')
    await seedRecipe({ _id: 'r1', userId: 'u1', title: 'A' })
    await getDB().collection('reports').insertOne({
      targetType: 'recipe', recipeId: 'r1', status: 'open',
    })
    const res = await request(app).get('/api/admin/users?query=chef').set(AUTH_HEADER)
    expect(res.body.users[0].counts.openReports).toBe(1)
  })

  it('resolves an email query through Firebase Auth', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'u1', email: 'alice@example.com' },
    ])
    await seedUser('u1', 'alice')
    const res = await request(app)
      .get('/api/admin/users?query=alice@example.com')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].username).toBe('alice')
    expect(res.body.users[0].email).toBe('alice@example.com')
  })

  it('returns empty for an unknown email', async () => {
    admin.__setClaims({ admin: true })
    const res = await request(app)
      .get('/api/admin/users?query=ghost@nowhere.com')
      .set(AUTH_HEADER)
    expect(res.body).toEqual({ users: [], totalCount: 0 })
  })
})

describe('GET /api/admin/users/:uid', () => {
  it('returns detail with email + recent content', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'u1', email: 'alice@example.com' },
    ])
    await seedUser('u1', 'alice')
    await seedRecipe({ _id: 'r1', userId: 'u1', title: 'A' })
    await seedRating({ username: 'alice', recipeId: 'r9', rating: 4, reviewText: 'ok' })

    const res = await request(app).get('/api/admin/users/u1').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('alice')
    expect(res.body.email).toBe('alice@example.com')
    expect(res.body.recentRecipes).toHaveLength(1)
    expect(res.body.recentReviews).toHaveLength(1)
  })
})

describe('PATCH /api/admin/users/:uid/status', () => {
  it('requires admin', async () => {
    const res = await request(app)
      .patch('/api/admin/users/u1/status')
      .set(AUTH_HEADER)
      .send({ status: 'suspended' })
    expect(res.status).toBe(403)
  })

  it('suspends a user and upserts the users record', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([{ uid: TEST_UID, admin: true }, { uid: 'u1', email: 'u1@x.com' }])
    const res = await request(app)
      .patch('/api/admin/users/u1/status')
      .set(AUTH_HEADER)
      .send({ status: 'suspended', reason: 'spamming' })
    expect(res.status).toBe(200)
    const doc = await getDB().collection('users').findOne({ _id: 'u1' })
    expect(doc.status).toBe('suspended')
    expect(doc.statusReason).toBe('spamming')
    expect(doc.statusUpdatedBy).toBe(TEST_UID)
  })

  it('clears the reason when restoring to active', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([{ uid: TEST_UID, admin: true }, { uid: 'u1', email: 'u1@x.com' }])
    await getDB().collection('users').insertOne({ _id: 'u1', status: 'banned', statusReason: 'bad' })
    await request(app)
      .patch('/api/admin/users/u1/status')
      .set(AUTH_HEADER)
      .send({ status: 'active' })
    const doc = await getDB().collection('users').findOne({ _id: 'u1' })
    expect(doc.status).toBe('active')
    expect(doc.statusReason).toBeNull()
  })

  it('rejects an invalid status', async () => {
    admin.__setClaims({ admin: true })
    const res = await request(app)
      .patch('/api/admin/users/u1/status')
      .set(AUTH_HEADER)
      .send({ status: 'frozen' })
    expect(res.status).toBe(400)
  })

  it('refuses to change your own status', async () => {
    admin.__setClaims({ admin: true })
    const res = await request(app)
      .patch(`/api/admin/users/${TEST_UID}/status`)
      .set(AUTH_HEADER)
      .send({ status: 'suspended' })
    expect(res.status).toBe(400)
  })

  it('refuses to suspend another admin', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, admin: true },
      { uid: 'admin2', email: 'a2@x.com', admin: true },
    ])
    const res = await request(app)
      .patch('/api/admin/users/admin2/status')
      .set(AUTH_HEADER)
      .send({ status: 'banned' })
    expect(res.status).toBe(403)
  })

  it('404s an unknown target uid', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([{ uid: TEST_UID, admin: true }])
    const res = await request(app)
      .patch('/api/admin/users/ghost/status')
      .set(AUTH_HEADER)
      .send({ status: 'suspended' })
    expect(res.status).toBe(404)
  })
})
