/**
 * requireActive enforcement: a suspended/banned user is blocked from content &
 * social writes (403 + machine code), while active and legacy (no record) users
 * pass through. Self-service deletes stay allowed even when blocked.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedUser, seedRating } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

async function setStatus(status, reason = 'policy violation') {
  await getDB()
    .collection('users')
    .updateOne({ _id: TEST_UID }, { $set: { status, statusReason: reason } }, { upsert: true })
}

afterEach(async () => {
  admin.__resetClaims()
  const db = getDB()
  await Promise.all([
    db.collection('users').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('reports').deleteMany({}),
  ])
})

describe('requireActive blocks suspended/banned users from writes', () => {
  it('suspended → 403 ACCOUNT_SUSPENDED with reason on addRecipe', async () => {
    await setStatus('suspended', 'spam')
    const res = await request(app)
      .post('/api/addRecipe')
      .set(AUTH_HEADER)
      .send({ title: 'x' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED')
    expect(res.body.reason).toBe('spam')
  })

  it('banned → 403 ACCOUNT_BANNED on addRating', async () => {
    await setStatus('banned')
    const res = await request(app)
      .post('/api/addRating?recipeId=r1&rating=5')
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_BANNED')
  })

  it('banned → 403 on POST /reports', async () => {
    await setStatus('banned')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'recipe', recipeId: 'r1', reason: 'spam' })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_BANNED')
  })
})

describe('requireActive lets active / legacy users through', () => {
  it('active status passes the gate (report is created)', async () => {
    await setStatus('active')
    await seedRecipe({ _id: 'r1', userId: 'someone-else', title: 'T' })
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'recipe', recipeId: 'r1', reason: 'spam' })
    expect(res.status).toBe(201)
  })

  it('legacy user with NO users record passes the gate', async () => {
    await seedRecipe({ _id: 'r1', userId: 'someone-else', title: 'T' })
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'recipe', recipeId: 'r1', reason: 'spam' })
    expect(res.status).toBe(201)
  })
})

describe('GET /api/getMyStatus', () => {
  it('returns active by default (no users record)', async () => {
    const res = await request(app).get('/api/getMyStatus').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'active', statusReason: null })
  })

  it('returns status + reason and stays reachable while suspended', async () => {
    await setStatus('suspended', 'spam')
    const res = await request(app).get('/api/getMyStatus').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'suspended', statusReason: 'spam' })
  })
})

describe('deletes remain allowed when suspended (not punitive)', () => {
  it('a suspended user can still delete their own review', async () => {
    await setStatus('suspended')
    await seedUser(TEST_UID, 'me')
    await seedRating({ username: 'me', recipeId: 'r1', reviewText: 'hi', rating: 5 })
    const res = await request(app).delete('/api/deleteReview?recipeId=r1').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)
  })
})
