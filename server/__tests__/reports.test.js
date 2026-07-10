/**
 * Reports endpoints (server/routes/reports.js).
 *
 * Auth: server/__mocks__/firebase-admin.js resolves verifyIdToken to
 * { uid: 'test-uid' }. Admin-only routes additionally require the `admin`
 * claim — set via admin.__setClaims({ admin: true }) and cleared in afterEach.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const { ObjectId } = require('mongodb')
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedRating, seedUser } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

afterEach(async () => {
  admin.__resetClaims()
  const db = getDB()
  await Promise.all([
    db.collection('reports').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
  ])
})

const validRecipeReport = {
  targetType: 'recipe',
  recipeId: 'recipe-001',
  reason: 'spam',
  details: 'looks like spam',
}

describe('POST /api/reports', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/reports').send(validRecipeReport)
    expect(res.status).toBe(401)
  })

  it('creates a recipe report stamped with the reporter uid', async () => {
    const res = await request(app).post('/api/reports').set(AUTH_HEADER).send(validRecipeReport)
    expect(res.status).toBe(201)
    expect(res.body.targetType).toBe('recipe')
    expect(res.body.recipeId).toBe('recipe-001')
    expect(res.body.reporterUid).toBe(TEST_UID)
    expect(res.body.status).toBe('open')
    expect(res.body.reportedUsername).toBeUndefined()
  })

  it('creates a review report carrying reportedUsername', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'baduser', reason: 'offensive' })
    expect(res.status).toBe(201)
    expect(res.body.reportedUsername).toBe('baduser')
  })

  // D1: snapshot the reported user's stable uid so the report stays attached
  // across a rename. Resolved case-insensitively from the usernames collection.
  it('stamps reportedUid on a review report when the handle resolves', async () => {
    await seedUser('bad-uid', 'BadUser')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'baduser', reason: 'offensive' })
    expect(res.status).toBe(201)
    // reportedUid is stamped on the stored doc but never echoed to the reporter
    // (echoing it leaked any handle's Firebase uid — see the route comment).
    expect(res.body.reportedUid).toBeUndefined()
    const stored = await getDB().collection('reports').findOne({ reporterUid: TEST_UID })
    expect(stored.reportedUid).toBe('bad-uid')
  })

  it('leaves reportedUid null when the reported handle has no account', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'ghost', reason: 'offensive' })
    expect(res.status).toBe(201)
    const stored = await getDB().collection('reports').findOne({ reporterUid: TEST_UID })
    expect(stored.reportedUid).toBeNull()
  })

  it('does not stamp reportedUid on a recipe report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send(validRecipeReport)
    expect(res.status).toBe(201)
    const stored = await getDB().collection('reports').findOne({ reporterUid: TEST_UID })
    expect(stored.reportedUid).toBeUndefined()
  })

  it('creates a user report carrying reportedUsername and no recipeId', async () => {
    await seedUser('bad-uid', 'baduser')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'baduser', reason: 'offensive' })
    expect(res.status).toBe(201)
    expect(res.body.targetType).toBe('user')
    expect(res.body.reportedUsername).toBe('baduser')
    expect(res.body.recipeId).toBeUndefined()
    expect(res.body.reporterUid).toBe(TEST_UID)
  })

  it('stamps reportedUid on a user report when the handle resolves', async () => {
    await seedUser('bad-uid', 'BadUser')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'baduser', reason: 'offensive' })
    expect(res.status).toBe(201)
    expect(res.body.reportedUid).toBeUndefined()
    const stored = await getDB().collection('reports').findOne({ reporterUid: TEST_UID })
    expect(stored.reportedUid).toBe('bad-uid')
  })

  it('stores the CANONICAL username casing, not the caller-supplied casing', async () => {
    // Rename propagation and the admin openReports tally match reportedUsername
    // case-sensitively, so a mis-cased report would detach from its target.
    await seedUser('bad-uid', 'BadUser')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'bADuSeR', reason: 'offensive' })
    expect(res.status).toBe(201)
    const stored = await getDB().collection('reports').findOne({ reporterUid: TEST_UID })
    expect(stored.reportedUsername).toBe('BadUser')
  })

  it('requires reportedUsername for a user report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reason: 'spam' })
    expect(res.status).toBe(400)
  })

  it('does not require recipeId for a user report', async () => {
    await seedUser('bad-uid', 'baduser')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'baduser', reason: 'spam' })
    expect(res.status).toBe(201)
  })

  it('404s a user report against a handle with no account', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'ghost', reason: 'spam' })
    expect(res.status).toBe(404)
  })

  it('rejects reporting yourself (user report)', async () => {
    // The reporter's own handle resolves to TEST_UID (the verified token's uid).
    await seedUser(TEST_UID, 'me')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'me', reason: 'spam' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/yourself/i)
  })

  it('rejects reporting your own review', async () => {
    await seedUser(TEST_UID, 'me')
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'me', reason: 'spam' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/your own review/i)
  })

  it('rate-limits to one open user report per reporter+target (409)', async () => {
    await seedUser('bad-uid', 'baduser')
    const body = { targetType: 'user', reportedUsername: 'baduser', reason: 'spam' }
    const first = await request(app).post('/api/reports').set(AUTH_HEADER).send(body)
    expect(first.status).toBe(201)
    const second = await request(app).post('/api/reports').set(AUTH_HEADER).send(body)
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('ALREADY_REPORTED')
  })

  it('rate-limits a user report case-insensitively on the handle (409)', async () => {
    await seedUser('bad-uid', 'BadUser')
    const first = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'BadUser', reason: 'spam' })
    expect(first.status).toBe(201)
    // A different casing of the same handle is the same target, not a new one.
    const second = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'baduser', reason: 'spam' })
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('ALREADY_REPORTED')
  })

  it('treats reports against two different users as distinct targets', async () => {
    await seedUser('alice-uid', 'alice')
    await seedUser('bob-uid', 'bob')
    const a = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'alice', reason: 'spam' })
    const b = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'bob', reason: 'spam' })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
  })

  it('rejects an invalid targetType', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ ...validRecipeReport, targetType: 'comment' })
    expect(res.status).toBe(400)
  })

  it('requires reportedUsername for a review report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reason: 'spam' })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid reason', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ ...validRecipeReport, reason: 'i-dont-like-it' })
    expect(res.status).toBe(400)
  })

  it('accepts incorrect_info on a recipe report (N2)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ ...validRecipeReport, reason: 'incorrect_info' })
    expect(res.status).toBe(201)
    expect(res.body.reason).toBe('incorrect_info')
  })

  it('rejects incorrect_info on a review report — recipe-only reason (N2)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({
        targetType: 'review',
        recipeId: 'recipe-001',
        reportedUsername: 'baduser',
        reason: 'incorrect_info',
      })
    expect(res.status).toBe(400)
    // The reason is otherwise valid — it's the target that's wrong — so the
    // error names the gating, not "Invalid reason".
    expect(res.body.error).toMatch(/only applies to recipe/i)
  })

  it('rejects incorrect_info on a user report — recipe-only reason (N2)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'user', reportedUsername: 'baduser', reason: 'incorrect_info' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/only applies to recipe/i)
  })

  it('rejects over-long details', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ ...validRecipeReport, details: 'a'.repeat(1001) })
    expect(res.status).toBe(400)
  })

  it('rate-limits to one open report per reporter+target (409)', async () => {
    const first = await request(app).post('/api/reports').set(AUTH_HEADER).send(validRecipeReport)
    expect(first.status).toBe(201)
    const second = await request(app).post('/api/reports').set(AUTH_HEADER).send(validRecipeReport)
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('ALREADY_REPORTED')
  })

  it('allows a new report once the prior one is no longer open', async () => {
    const first = await request(app).post('/api/reports').set(AUTH_HEADER).send(validRecipeReport)
    await getDB()
      .collection('reports')
      .updateOne({ _id: new ObjectId(first.body._id) }, { $set: { status: 'dismissed' } })
    const second = await request(app).post('/api/reports').set(AUTH_HEADER).send(validRecipeReport)
    expect(second.status).toBe(201)
  })

  it('treats two reviews on the same recipe by different authors as distinct targets', async () => {
    const a = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'alice', reason: 'spam' })
    const b = await request(app)
      .post('/api/reports')
      .set(AUTH_HEADER)
      .send({ targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'bob', reason: 'spam' })
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
  })
})

describe('GET /api/reports', () => {
  it('requires admin (403 for a logged-in non-admin)', async () => {
    const res = await request(app).get('/api/reports').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns the queue with open count and target enrichment for an admin', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ _id: 'recipe-001', title: 'Reported Dish', recipeImage: 'img', userId: 'owner' })
    await seedRating({ username: 'baduser', recipeId: 'recipe-001', reviewText: 'nasty', rating: 1 })
    await getDB().collection('reports').insertMany([
      { _id: new ObjectId(), targetType: 'recipe', recipeId: 'recipe-001', reporterUid: 'u1', reason: 'spam', status: 'open', createdAt: new Date() },
      { _id: new ObjectId(), targetType: 'review', recipeId: 'recipe-001', reportedUsername: 'baduser', reporterUid: 'u2', reason: 'offensive', status: 'resolved', createdAt: new Date() },
    ])

    const res = await request(app).get('/api/reports').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.openCount).toBe(1)
    const recipeReport = res.body.reports.find((r) => r.targetType === 'recipe')
    expect(recipeReport.target.recipe.title).toBe('Reported Dish')
    const reviewReport = res.body.reports.find((r) => r.targetType === 'review')
    expect(reviewReport.target.review.reviewText).toBe('nasty')
  })

  it('previews a reported review by the stable userId, surviving an author rename', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ _id: 'recipe-001', title: 'Reported Dish', recipeImage: 'img', userId: 'owner' })
    // The review author has since renamed: the ratings doc is keyed by the
    // stable userId 'bad-uid' and now carries the CURRENT handle 'newhandle'.
    // The report snapshotted the OLD handle plus the uid (D1).
    await seedRating({ userId: 'bad-uid', username: 'newhandle', recipeId: 'recipe-001', reviewText: 'nasty', rating: 1 })
    await getDB().collection('reports').insertOne({
      _id: new ObjectId(), targetType: 'review', recipeId: 'recipe-001',
      reportedUsername: 'oldhandle', reportedUid: 'bad-uid',
      reporterUid: 'u2', reason: 'offensive', status: 'open', createdAt: new Date(),
    })

    const res = await request(app).get('/api/reports').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const reviewReport = res.body.reports.find((r) => r.targetType === 'review')
    // Matched by the snapshotted userId, not the stale handle → preview resolves.
    expect(reviewReport.target.review.reviewText).toBe('nasty')
  })

  it('surfaces a user report in the queue with no recipe/review snapshot', async () => {
    admin.__setClaims({ admin: true })
    await getDB().collection('reports').insertOne({
      _id: new ObjectId(),
      targetType: 'user',
      reportedUsername: 'baduser',
      reportedUid: 'bad-uid',
      reporterUid: 'u1',
      reason: 'offensive',
      status: 'open',
      createdAt: new Date(),
    })

    const res = await request(app).get('/api/reports').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const userReport = res.body.reports.find((r) => r.targetType === 'user')
    expect(userReport.reportedUsername).toBe('baduser')
    expect(userReport.target.recipe).toBeNull()
    expect(userReport.target.review).toBeNull()
  })

  it('filters by status', async () => {
    admin.__setClaims({ admin: true })
    await getDB().collection('reports').insertMany([
      { _id: new ObjectId(), targetType: 'recipe', recipeId: 'r1', reporterUid: 'u1', reason: 'spam', status: 'open', createdAt: new Date() },
      { _id: new ObjectId(), targetType: 'recipe', recipeId: 'r2', reporterUid: 'u2', reason: 'spam', status: 'resolved', createdAt: new Date() },
    ])
    const res = await request(app).get('/api/reports?status=open').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
    expect(res.body.reports[0].status).toBe('open')
  })
})

describe('PATCH /api/reports/:id', () => {
  async function seedReport(overrides = {}) {
    const doc = {
      _id: new ObjectId(),
      targetType: 'recipe',
      recipeId: 'recipe-001',
      reporterUid: 'u1',
      reason: 'spam',
      status: 'open',
      createdAt: new Date(),
      ...overrides,
    }
    await getDB().collection('reports').insertOne(doc)
    return doc
  }

  it('requires admin', async () => {
    const report = await seedReport()
    const res = await request(app).patch(`/api/reports/${report._id}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(res.status).toBe(403)
  })

  it('resolves a report and stamps resolvedBy/resolvedAt', async () => {
    admin.__setClaims({ admin: true })
    const report = await seedReport()
    const res = await request(app).patch(`/api/reports/${report._id}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolvedBy).toBe(TEST_UID)
    expect(res.body.resolvedAt).toBeDefined()
  })

  it('rejects an invalid status', async () => {
    admin.__setClaims({ admin: true })
    const report = await seedReport()
    const res = await request(app).patch(`/api/reports/${report._id}`).set(AUTH_HEADER).send({ status: 'open' })
    expect(res.status).toBe(400)
  })

  it('404s for a missing or malformed id', async () => {
    admin.__setClaims({ admin: true })
    const missing = await request(app).patch(`/api/reports/${new ObjectId()}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(missing.status).toBe(404)
    const malformed = await request(app).patch('/api/reports/not-an-id').set(AUTH_HEADER).send({ status: 'resolved' })
    expect(malformed.status).toBe(404)
  })

  it('writes an audit entry when a report is resolved', async () => {
    admin.__setClaims({ admin: true })
    const report = await seedReport({ reportedUsername: 'baduser', targetType: 'review' })
    await request(app).patch(`/api/reports/${report._id}`).set(AUTH_HEADER).send({ status: 'dismissed' })
    const entries = await getDB().collection('auditLog').find({}).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].action).toBe('report.dismiss')
    expect(entries[0].actorUid).toBe(TEST_UID)
    expect(entries[0].targetType).toBe('report')
  })

  it('409s when re-closing an already-resolved report and leaves it untouched', async () => {
    admin.__setClaims({ admin: true })
    const resolvedAt = new Date('2020-01-01T00:00:00Z')
    const report = await seedReport({
      status: 'resolved',
      resolvedBy: 'first-admin',
      resolvedAt,
    })
    const res = await request(app)
      .patch(`/api/reports/${report._id}`)
      .set(AUTH_HEADER)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(409)

    // Original attribution/status must be preserved (no flip, no overwrite).
    const stored = await getDB().collection('reports').findOne({ _id: report._id })
    expect(stored.status).toBe('resolved')
    expect(stored.resolvedBy).toBe('first-admin')
    expect(stored.resolvedAt).toEqual(resolvedAt)
    // No duplicate audit row written for the rejected re-close.
    const entries = await getDB().collection('auditLog').find({}).toArray()
    expect(entries).toHaveLength(0)
  })
})

describe('PATCH /api/reports/bulk', () => {
  async function seedReports(n, overrides = {}) {
    const docs = Array.from({ length: n }, (_, i) => ({
      _id: new ObjectId(),
      targetType: 'recipe',
      recipeId: `recipe-${i}`,
      reporterUid: `u${i}`,
      reason: 'spam',
      status: 'open',
      createdAt: new Date(),
      ...overrides,
    }))
    await getDB().collection('reports').insertMany(docs)
    return docs
  }

  it('requires admin', async () => {
    const [a] = await seedReports(1)
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids: [String(a._id)], status: 'resolved' })
    expect(res.status).toBe(403)
  })

  it('resolves many open reports and reports how many changed', async () => {
    admin.__setClaims({ admin: true })
    const docs = await seedReports(3)
    const ids = docs.map((d) => String(d._id))
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids, status: 'resolved' })
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(3)
    const remaining = await getDB().collection('reports').countDocuments({ status: 'open' })
    expect(remaining).toBe(0)
    // One audit entry per report actually closed.
    const audits = await getDB().collection('auditLog').countDocuments({ action: 'report.resolve' })
    expect(audits).toBe(3)
  })

  it('only touches open reports (skips already-closed ids in the batch)', async () => {
    admin.__setClaims({ admin: true })
    const open = await seedReports(2)
    const closed = await seedReports(1, { status: 'dismissed' })
    const ids = [...open, ...closed].map((d) => String(d._id))
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids, status: 'resolved' })
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(2)
  })

  it('rejects an empty id list and an invalid status', async () => {
    admin.__setClaims({ admin: true })
    const empty = await request(app).patch('/api/reports/bulk').set(AUTH_HEADER).send({ ids: [], status: 'resolved' })
    expect(empty.status).toBe(400)
    const badStatus = await request(app).patch('/api/reports/bulk').set(AUTH_HEADER).send({ ids: ['x'], status: 'open' })
    expect(badStatus.status).toBe(400)
  })

  it('rejects a batch over the cap', async () => {
    admin.__setClaims({ admin: true })
    const ids = Array.from({ length: 101 }, () => String(new ObjectId()))
    const res = await request(app).patch('/api/reports/bulk').set(AUTH_HEADER).send({ ids, status: 'resolved' })
    expect(res.status).toBe(400)
  })
})
