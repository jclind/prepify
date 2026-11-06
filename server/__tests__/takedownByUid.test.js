/**
 * Review fix 1c (run 2 #2, CR-18 reports part) — review takedowns and report
 * labels follow the reported account's uid, not its handle.
 *
 * A handle can pass from one account to another (rename or account delete,
 * then someone else claims it). The admin takedown used to resolve the
 * report's handle to whoever holds it NOW, and a rename relabeled every report
 * carrying the old handle, so an old report could hide, email and relabel the
 * wrong person.
 */

jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { moderateText } = require('../util/textModeration')
const { seedRecipe, seedRating, seedUser } = require('./helpers/seed')

const AUTH = { Authorization: 'Bearer fake-test-token' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }
const RECIPE = { _id: 'r1', title: 'Soup', userId: 'author-uid', rating: { rateCount: 2, rateValue: 3 } }

const takedown = (body) =>
  request(app).patch('/api/admin/reviews/moderation').set(AUTH).send(body)

beforeEach(() => {
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
})

afterEach(async () => {
  admin.__resetClaims()
  const db = getDB()
  await Promise.all(
    ['recipes', 'ratings', 'reports', 'usernames', 'auditLog'].map((c) => db.collection(c).deleteMany({}))
  )
})

describe('PATCH /admin/reviews/moderation — targets the reported uid', () => {
  // first-uid held "chef", reviewed r1 and was reported, then gave the handle
  // up. second-uid now holds "chef" and has its own review on r1.
  beforeEach(async () => {
    await seedRecipe(RECIPE)
    await seedUser('second-uid', 'chef')
    await seedRating({ userId: 'first-uid', username: 'chef', recipeId: 'r1', rating: 1, reviewText: 'abusive' })
    await seedRating({ userId: 'second-uid', username: 'chef', recipeId: 'r1', rating: 5, reviewText: 'lovely' })
  })

  it('hides only the reported account\'s review when the handle has moved on', async () => {
    admin.__setClaims({ admin: true })
    const res = await takedown({ recipeId: 'r1', userId: 'first-uid', moderationHidden: true })
    expect(res.status).toBe(200)

    const ratings = getDB().collection('ratings')
    expect((await ratings.findOne({ userId: 'first-uid' })).moderationHidden).toBe(true)
    expect((await ratings.findOne({ userId: 'second-uid' })).moderationHidden).toBeUndefined()
  })

  it('restores by uid too, and works for an account with no handle any more', async () => {
    admin.__setClaims({ admin: true })
    await takedown({ recipeId: 'r1', userId: 'first-uid', moderationHidden: true })
    const res = await takedown({ recipeId: 'r1', userId: 'first-uid', moderationHidden: false })
    expect(res.status).toBe(200)
    expect((await getDB().collection('ratings').findOne({ userId: 'first-uid' })).moderationHidden).toBe(false)
  })

  it('no longer accepts a handle as the target', async () => {
    admin.__setClaims({ admin: true })
    const res = await takedown({ recipeId: 'r1', username: 'chef', moderationHidden: true })
    expect(res.status).toBe(400)
    expect(await getDB().collection('ratings').countDocuments({ moderationHidden: true })).toBe(0)
  })
})

describe('POST /setUsername — relabels only the renaming account\'s reports', () => {
  it('leaves another account\'s report under the same old handle alone', async () => {
    // test-uid holds "chef" now; first-uid held it before and was reported.
    await seedUser('test-uid', 'chef')
    const reports = getDB().collection('reports')
    await reports.insertMany([
      { _id: 'old', targetType: 'review', recipeId: 'r1', reportedUsername: 'chef', reportedUid: 'first-uid' },
      { _id: 'mine', targetType: 'user', reportedUsername: 'chef', reportedUid: 'test-uid' },
      { _id: 'stale', targetType: 'user', reportedUsername: 'olderhandle', reportedUid: 'test-uid' },
    ])

    const res = await request(app).post('/api/setUsername?username=newchef').set(AUTH)
    expect(res.status).toBe(200)

    expect((await reports.findOne({ _id: 'old' })).reportedUsername).toBe('chef')
    expect((await reports.findOne({ _id: 'mine' })).reportedUsername).toBe('newchef')
    expect((await reports.findOne({ _id: 'stale' })).reportedUsername).toBe('newchef')
  })
})
