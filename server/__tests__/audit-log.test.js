/**
 * Audit log (server/util/auditLog.js + GET /admin/audit on server/routes/admin.js,
 * and the recordAudit calls wired into the admin mutation endpoints).
 *
 * Auth: firebase-admin mock resolves verifyIdToken to { uid: 'test-uid' }.
 * Admin routes require __setClaims({ admin: true }).
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const { ObjectId } = require('mongodb')
const app = require('../app')
const { getDB } = require('../db')
const { seedUser } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

afterEach(async () => {
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('auditLog').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('users').deleteMany({}),
  ])
})

async function seedAudit(entries) {
  await getDB().collection('auditLog').insertMany(
    entries.map((e) => ({
      _id: new ObjectId(),
      actorUid: TEST_UID,
      targetType: 'recipe',
      targetId: 'r1',
      targetLabel: null,
      reason: null,
      metadata: null,
      createdAt: new Date(),
      ...e,
    }))
  )
}

describe('GET /api/admin/audit', () => {
  it('requires admin (403 for a logged-in non-admin)', async () => {
    const res = await request(app).get('/api/admin/audit').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns entries newest first, enriched with the actor username', async () => {
    admin.__setClaims({ admin: true })
    await seedUser(TEST_UID, 'adminuser')
    await seedAudit([
      { action: 'recipe.hide', createdAt: new Date('2026-01-01') },
      { action: 'recipe.unhide', createdAt: new Date('2026-02-01') },
    ])

    const res = await request(app).get('/api/admin/audit').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.entries[0].action).toBe('recipe.unhide') // newest first
    expect(res.body.entries[0].actorUsername).toBe('adminuser')
  })

  it('filters by action and by targetType', async () => {
    admin.__setClaims({ admin: true })
    await seedAudit([
      { action: 'recipe.hide', targetType: 'recipe' },
      { action: 'user.ban', targetType: 'user' },
      { action: 'report.resolve', targetType: 'report' },
    ])

    const byAction = await request(app).get('/api/admin/audit?action=user.ban').set(AUTH_HEADER)
    expect(byAction.body.totalCount).toBe(1)
    expect(byAction.body.entries[0].action).toBe('user.ban')

    const byTarget = await request(app).get('/api/admin/audit?targetType=report').set(AUTH_HEADER)
    expect(byTarget.body.totalCount).toBe(1)
    expect(byTarget.body.entries[0].targetType).toBe('report')
  })

  it('ignores an unknown action filter rather than returning nothing', async () => {
    admin.__setClaims({ admin: true })
    await seedAudit([{ action: 'recipe.hide' }])
    const res = await request(app).get('/api/admin/audit?action=bogus').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
  })

  it('paginates', async () => {
    admin.__setClaims({ admin: true })
    await seedAudit(Array.from({ length: 30 }, (_, i) => ({ action: 'recipe.hide', targetId: `r${i}` })))
    const page1 = await request(app).get('/api/admin/audit?page=1&perPage=25').set(AUTH_HEADER)
    expect(page1.body.entries).toHaveLength(25)
    expect(page1.body.totalCount).toBe(30)
    const page2 = await request(app).get('/api/admin/audit?page=2&perPage=25').set(AUTH_HEADER)
    expect(page2.body.entries).toHaveLength(5)
  })
})

describe('admin mutations write audit entries', () => {
  it('user suspension writes a user.suspend entry with reason + label', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'target-uid', email: 'target@test.dev' },
    ])
    await seedUser('target-uid', 'targetuser')

    const res = await request(app)
      .patch('/api/admin/users/target-uid/status')
      .set(AUTH_HEADER)
      .send({ status: 'suspended', reason: 'spamming' })
    expect(res.status).toBe(200)

    const entries = await getDB().collection('auditLog').find({}).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].action).toBe('user.suspend')
    expect(entries[0].actorUid).toBe(TEST_UID)
    expect(entries[0].targetType).toBe('user')
    expect(entries[0].targetId).toBe('target-uid')
    expect(entries[0].targetLabel).toBe('@targetuser')
    expect(entries[0].reason).toBe('spamming')
  })
})
