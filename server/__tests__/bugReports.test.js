/**
 * Bug report endpoints (server/routes/bugReports.js).
 *
 * Auth: server/__mocks__/firebase-admin.js resolves verifyIdToken to
 * { uid: 'test-uid' }. The POST endpoint uses optionalAuth (no header ⇒
 * anonymous). Admin-only routes require the `admin` claim, set via
 * admin.__setClaims({ admin: true }) and cleared in afterEach.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const { ObjectId } = require('mongodb')
const app = require('../app')
const { getDB } = require('../db')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

afterEach(async () => {
  admin.__resetClaims()
  const db = getDB()
  await Promise.all([
    db.collection('bugReports').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
  ])
})

const validReport = {
  category: 'bug',
  description: 'The save button does nothing on the recipe page.',
  url: '/recipes/abc',
  appVersion: '2.6.3',
}

describe('POST /api/bug-reports', () => {
  it('accepts an anonymous submission (no auth) and stores null reporterUid', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .set('User-Agent', 'jest-agent')
      .send(validReport)
    expect(res.status).toBe(201)
    expect(res.body.category).toBe('bug')
    expect(res.body.reporterUid).toBeNull()
    expect(res.body.status).toBe('open')
    expect(res.body.userAgent).toBe('jest-agent')
  })

  it('attaches reporterUid when a valid token is present', async () => {
    const res = await request(app).post('/api/bug-reports').set(AUTH_HEADER).send(validReport)
    expect(res.status).toBe(201)
    expect(res.body.reporterUid).toBe(TEST_UID)
  })

  it('rejects an invalid category', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...validReport, category: 'rant' })
    expect(res.status).toBe(400)
  })

  it('requires a non-empty description', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...validReport, description: '   ' })
    expect(res.status).toBe(400)
  })

  it('caps an over-long description rather than rejecting it', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...validReport, description: 'a'.repeat(5000) })
    expect(res.status).toBe(201)
    expect(res.body.description).toHaveLength(2000)
  })

  it('rejects a malformed optional email', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...validReport, email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('keeps a valid optional email for anonymous follow-up', async () => {
    const res = await request(app)
      .post('/api/bug-reports')
      .send({ ...validReport, email: 'reporter@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.reporterEmail).toBe('reporter@example.com')
  })
})

describe('GET /api/admin/bug-reports', () => {
  it('requires admin (403 for a logged-in non-admin)', async () => {
    const res = await request(app).get('/api/admin/bug-reports').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns the queue with open count and reporter username enrichment', async () => {
    admin.__setClaims({ admin: true })
    await getDB().collection('usernames').insertOne({ _id: 'u1', username: 'reporterUser' })
    await getDB().collection('bugReports').insertMany([
      { _id: new ObjectId(), reporterUid: 'u1', category: 'bug', description: 'x', status: 'open', createdAt: new Date() },
      { _id: new ObjectId(), reporterUid: null, category: 'idea', description: 'y', status: 'resolved', createdAt: new Date() },
    ])

    const res = await request(app).get('/api/admin/bug-reports').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.openCount).toBe(1)
    const named = res.body.reports.find((r) => r.reporterUid === 'u1')
    expect(named.reporterUsername).toBe('reporterUser')
    const anon = res.body.reports.find((r) => r.reporterUid === null)
    expect(anon.reporterUsername).toBeNull()
  })

  it('filters by status and category', async () => {
    admin.__setClaims({ admin: true })
    await getDB().collection('bugReports').insertMany([
      { _id: new ObjectId(), reporterUid: null, category: 'bug', description: 'a', status: 'open', createdAt: new Date() },
      { _id: new ObjectId(), reporterUid: null, category: 'idea', description: 'b', status: 'open', createdAt: new Date() },
      { _id: new ObjectId(), reporterUid: null, category: 'bug', description: 'c', status: 'resolved', createdAt: new Date() },
    ])
    const byStatus = await request(app).get('/api/admin/bug-reports?status=open').set(AUTH_HEADER)
    expect(byStatus.body.totalCount).toBe(2)
    const byCategory = await request(app).get('/api/admin/bug-reports?category=bug&status=open').set(AUTH_HEADER)
    expect(byCategory.body.totalCount).toBe(1)
  })
})

describe('PATCH /api/admin/bug-reports/:id', () => {
  async function seedReport(overrides = {}) {
    const doc = {
      _id: new ObjectId(),
      reporterUid: null,
      category: 'bug',
      description: 'x',
      status: 'open',
      createdAt: new Date(),
      ...overrides,
    }
    await getDB().collection('bugReports').insertOne(doc)
    return doc
  }

  it('requires admin', async () => {
    const report = await seedReport()
    const res = await request(app).patch(`/api/admin/bug-reports/${report._id}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(res.status).toBe(403)
  })

  it('resolves a report, stamps resolvedBy/resolvedAt, and writes an audit entry', async () => {
    admin.__setClaims({ admin: true })
    const report = await seedReport()
    const res = await request(app).patch(`/api/admin/bug-reports/${report._id}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolvedBy).toBe(TEST_UID)
    expect(res.body.resolvedAt).toBeDefined()
    const entries = await getDB().collection('auditLog').find({}).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].action).toBe('bugReport.resolve')
    expect(entries[0].targetType).toBe('bugReport')
  })

  it('rejects an invalid status', async () => {
    admin.__setClaims({ admin: true })
    const report = await seedReport()
    const res = await request(app).patch(`/api/admin/bug-reports/${report._id}`).set(AUTH_HEADER).send({ status: 'open' })
    expect(res.status).toBe(400)
  })

  it('404s for a missing or malformed id', async () => {
    admin.__setClaims({ admin: true })
    const missing = await request(app).patch(`/api/admin/bug-reports/${new ObjectId()}`).set(AUTH_HEADER).send({ status: 'resolved' })
    expect(missing.status).toBe(404)
    const malformed = await request(app).patch('/api/admin/bug-reports/not-an-id').set(AUTH_HEADER).send({ status: 'resolved' })
    expect(malformed.status).toBe(404)
  })
})

describe('PATCH /api/admin/bug-reports/bulk', () => {
  async function seedReports(n, overrides = {}) {
    const docs = Array.from({ length: n }, () => ({
      _id: new ObjectId(),
      reporterUid: null,
      category: 'bug',
      description: 'x',
      status: 'open',
      createdAt: new Date(),
      ...overrides,
    }))
    await getDB().collection('bugReports').insertMany(docs)
    return docs
  }

  it('requires admin', async () => {
    const [a] = await seedReports(1)
    const res = await request(app)
      .patch('/api/admin/bug-reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids: [String(a._id)], status: 'resolved' })
    expect(res.status).toBe(403)
  })

  it('resolves many open reports, reports how many changed, and audits each', async () => {
    admin.__setClaims({ admin: true })
    const docs = await seedReports(3)
    const ids = docs.map((d) => String(d._id))
    const res = await request(app)
      .patch('/api/admin/bug-reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids, status: 'dismissed' })
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(3)
    const remaining = await getDB().collection('bugReports').countDocuments({ status: 'open' })
    expect(remaining).toBe(0)
    const audits = await getDB().collection('auditLog').countDocuments({ action: 'bugReport.dismiss' })
    expect(audits).toBe(3)
  })

  it('only touches open reports (skips already-closed ids in the batch)', async () => {
    admin.__setClaims({ admin: true })
    const open = await seedReports(2)
    const closed = await seedReports(1, { status: 'dismissed' })
    const ids = [...open, ...closed].map((d) => String(d._id))
    const res = await request(app)
      .patch('/api/admin/bug-reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids, status: 'resolved' })
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(2)
  })

  it('rejects an empty id list, an invalid status, and an over-cap batch', async () => {
    admin.__setClaims({ admin: true })
    const empty = await request(app).patch('/api/admin/bug-reports/bulk').set(AUTH_HEADER).send({ ids: [], status: 'resolved' })
    expect(empty.status).toBe(400)
    const badStatus = await request(app).patch('/api/admin/bug-reports/bulk').set(AUTH_HEADER).send({ ids: ['x'], status: 'open' })
    expect(badStatus.status).toBe(400)
    const ids = Array.from({ length: 101 }, () => String(new ObjectId()))
    const tooMany = await request(app).patch('/api/admin/bug-reports/bulk').set(AUTH_HEADER).send({ ids, status: 'resolved' })
    expect(tooMany.status).toBe(400)
  })
})
