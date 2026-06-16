/**
 * Admin analytics overview: headline totals (with legacy-safe recipe status and
 * written-review-only counts), zero-filled date-bounded over-time series, and the
 * recent-actions feed enriched with actor usernames. Admin-gated.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedUser, seedRating } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// A Date `n` days before now (UTC), at midday so it lands squarely inside its day.
function daysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10)
}

afterEach(async () => {
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('usernames').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('reports').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
  ])
})

describe('GET /api/admin/analytics', () => {
  it('requires admin', async () => {
    const res = await request(app).get('/api/admin/analytics').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('reports headline totals with legacy-safe recipe status + written-review counts', async () => {
    admin.__setClaims({ admin: true })
    await seedUser('u1', 'alice')
    await seedUser('u2', 'bob')

    // Recipe mix: one explicit active, one hidden, one unpublished, one featured,
    // and one LEGACY recipe with no status field (must count as active).
    await seedRecipe({ _id: 'r1', userId: 'u1', status: 'active', createdAt: daysAgo(1) })
    await seedRecipe({ _id: 'r2', userId: 'u1', status: 'hidden', createdAt: daysAgo(1) })
    await seedRecipe({ _id: 'r3', userId: 'u1', status: 'unpublished', createdAt: daysAgo(1) })
    await seedRecipe({ _id: 'r4', userId: 'u1', status: 'active', featured: true, createdAt: daysAgo(1) })
    await seedRecipe({ _id: 'r5', userId: 'u2', createdAt: daysAgo(1) }) // legacy: no status

    // Reviews: two written, one bare star-only (must not count).
    await seedRating({ username: 'alice', recipeId: 'r1', rating: 5, reviewText: 'great' })
    await seedRating({ username: 'bob', recipeId: 'r1', rating: 4, reviewText: 'good' })
    await seedRating({ username: 'bob', recipeId: 'r2', rating: 3, reviewText: '' })

    await getDB().collection('reports').insertMany([
      { targetType: 'recipe', recipeId: 'r1', status: 'open', createdAt: daysAgo(1) },
      { targetType: 'recipe', recipeId: 'r2', status: 'open', createdAt: daysAgo(1) },
      { targetType: 'recipe', recipeId: 'r3', status: 'resolved', createdAt: daysAgo(1) },
      { targetType: 'recipe', recipeId: 'r4', status: 'dismissed', createdAt: daysAgo(1) },
    ])

    const res = await request(app).get('/api/admin/analytics').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const { totals } = res.body
    expect(totals.users).toBe(2)
    expect(totals.recipes).toEqual({
      total: 5,
      active: 3, // r1, r4, and legacy r5
      hidden: 1,
      unpublished: 1,
      featured: 1,
    })
    expect(totals.reviews).toBe(2) // bare star-only excluded
    expect(totals.reports).toEqual({ open: 2, resolved: 1, dismissed: 1 })
    // No automod activity seeded here → all zero, all-time.
    expect(totals.moderation).toEqual({ autoHeld: 0, autoBlocked: 0, autoFlagsDismissed: 0 })
  })

  it('tallies automated-moderation activity from the audit log + dismissed automod reports', async () => {
    admin.__setClaims({ admin: true })
    const db = getDB()
    await db.collection('auditLog').insertMany([
      { action: 'recipe.autohold', actorType: 'system', targetType: 'recipe', targetId: 'r1', createdAt: daysAgo(1) },
      { action: 'recipe.autohold', actorType: 'system', targetType: 'recipe', targetId: 'r2', createdAt: daysAgo(2) },
      { action: 'content.blocked', actorType: 'system', targetType: 'user', targetId: 'u1', createdAt: daysAgo(1) },
      { action: 'content.blocked', actorType: 'system', targetType: 'user', targetId: 'u2', createdAt: daysAgo(3) },
      { action: 'content.blocked', actorType: 'system', targetType: 'user', targetId: 'u3', createdAt: daysAgo(3) },
      // A human admin action must NOT be counted as automated.
      { action: 'recipe.hide', actorType: 'admin', targetType: 'recipe', targetId: 'r3', createdAt: daysAgo(1) },
    ])
    await db.collection('reports').insertMany([
      { targetType: 'recipe', recipeId: 'r1', source: 'automod', status: 'dismissed', createdAt: daysAgo(1) },
      // A dismissed USER report (no source) is not a false-positive restore.
      { targetType: 'recipe', recipeId: 'r2', status: 'dismissed', createdAt: daysAgo(1) },
      // An open automod report is not a restore either.
      { targetType: 'recipe', recipeId: 'r3', source: 'automod', status: 'open', createdAt: daysAgo(1) },
    ])

    const res = await request(app).get('/api/admin/analytics').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totals.moderation).toEqual({
      autoHeld: 2,
      autoBlocked: 3,
      autoFlagsDismissed: 1,
    })
  })

  it('returns a zero-filled, date-bounded daily series', async () => {
    admin.__setClaims({ admin: true })
    // Two recipes today, one inside the window (3 days ago), one OUTSIDE (40 days).
    await seedRecipe({ _id: 'r1', userId: 'u1', createdAt: daysAgo(0) })
    await seedRecipe({ _id: 'r2', userId: 'u1', createdAt: daysAgo(0) })
    await seedRecipe({ _id: 'r3', userId: 'u1', createdAt: daysAgo(3) })
    await seedRecipe({ _id: 'r4', userId: 'u1', createdAt: daysAgo(40) })

    const res = await request(app).get('/api/admin/analytics?days=7').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.days).toBe(7)

    const series = res.body.recipesOverTime
    expect(series).toHaveLength(7) // one bucket per day, zero-filled
    // Oldest first, contiguous, last bucket is today.
    expect(series[series.length - 1].date).toBe(todayUTC())
    const total = series.reduce((sum, b) => sum + b.count, 0)
    expect(total).toBe(3) // the 40-day-old recipe is outside the window
    expect(series.find((b) => b.date === todayUTC()).count).toBe(2)
  })

  it('clamps days to the allowed range', async () => {
    admin.__setClaims({ admin: true })
    const tooBig = await request(app).get('/api/admin/analytics?days=999').set(AUTH_HEADER)
    expect(tooBig.body.days).toBe(90)
    expect(tooBig.body.recipesOverTime).toHaveLength(90)

    const tooSmall = await request(app).get('/api/admin/analytics?days=1').set(AUTH_HEADER)
    expect(tooSmall.body.days).toBe(7)
  })

  it('surfaces recent admin actions newest-first with actor usernames', async () => {
    admin.__setClaims({ admin: true })
    await seedUser('admin-uid', 'mod')
    await getDB().collection('auditLog').insertMany([
      {
        action: 'recipe.hide', actorUid: 'admin-uid', targetType: 'recipe',
        targetId: 'r1', targetLabel: 'Soup', createdAt: daysAgo(2),
      },
      {
        action: 'report.resolve', actorUid: 'admin-uid', targetType: 'report',
        targetId: 'rep1', targetLabel: '@alice', createdAt: daysAgo(0),
      },
    ])

    const res = await request(app).get('/api/admin/analytics').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const actions = res.body.recentActions
    expect(actions).toHaveLength(2)
    expect(actions[0].action).toBe('report.resolve') // newest first
    expect(actions[0].actorUsername).toBe('mod')
  })
})
