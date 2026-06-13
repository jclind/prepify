/**
 * Admin email notifications (server/util/email.js + the four moderation wirings).
 *
 * The `resend` package is mocked so no network call is made; `__send` is the
 * shared spy behind the lazily-built Resend client. firebase-admin is auto-mocked
 * — __setUsers([{ uid, email }]) supplies the addresses helpers resolve to.
 *
 * Contract under test: the right event mails the right recipient; dismiss/unhide
 * stay silent; the whole thing no-ops without RESEND_API_KEY; and neither a
 * recipient miss nor a provider failure ever throws into the moderation route.
 */

// Mocked Resend client. The factory returns the SAME `send` spy every time the
// (lazily-cached) client is constructed, so assertions hold across calls.
jest.mock('resend', () => {
  const send = jest.fn()
  return { Resend: jest.fn(() => ({ emails: { send } })), __send: send }
})

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const { ObjectId } = require('mongodb')
const { __send: sendMock } = require('resend')
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedUser, seedRating } = require('./helpers/seed')
const {
  sendEmail,
  flushNotifications,
  notifyReportResolved,
  notifyAccountStatus,
  notifyRecipeHidden,
  notifyReviewTakenDown,
} = require('../util/email')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key'
  delete process.env.EMAIL_ENABLED
  sendMock.mockReset()
  // Resend's SDK resolves with { data, error } — it does not throw on API errors.
  sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null })
})

afterEach(async () => {
  await flushNotifications() // drain any background sends a test left in flight
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('reports').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
  ])
})

// Read the `to`/`subject` of the Nth (default first) send call.
function sentArg(i = 0) {
  return sendMock.mock.calls[i][0]
}

describe('email wrapper gating', () => {
  it('no-ops (never calls the provider) when RESEND_API_KEY is absent', async () => {
    delete process.env.RESEND_API_KEY
    admin.__setUsers([{ uid: 'reporter', email: 'r@example.dev' }])
    await notifyReportResolved('reporter')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('no-ops when EMAIL_ENABLED is explicitly false even with a key', async () => {
    process.env.EMAIL_ENABLED = 'false'
    admin.__setUsers([{ uid: 'reporter', email: 'r@example.dev' }])
    await notifyReportResolved('reporter')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('does not send when the recipient has no resolvable email', async () => {
    admin.__setUsers([]) // getUser throws not-found ⇒ null email
    await notifyReportResolved('ghost-uid')
    expect(sendMock).not.toHaveBeenCalled()
  })
})

describe('per-event recipient resolution', () => {
  it('reportResolved mails the reporter', async () => {
    admin.__setUsers([{ uid: 'reporter', email: 'reporter@example.dev' }])
    await notifyReportResolved('reporter')
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sentArg().to).toBe('reporter@example.dev')
    expect(sentArg().subject).toMatch(/reported/i)
  })

  it('accountStatus mails the user on suspend and ban, but not on activate', async () => {
    admin.__setUsers([{ uid: 'u1', email: 'u1@example.dev' }])

    await notifyAccountStatus('u1', 'suspended', 'spamming')
    expect(sentArg().to).toBe('u1@example.dev')
    expect(sentArg().subject).toMatch(/suspended/i)
    expect(sentArg().html).toMatch(/spamming/) // reason surfaced

    sendMock.mockClear()
    await notifyAccountStatus('u1', 'banned')
    expect(sentArg().subject).toMatch(/banned/i)

    sendMock.mockClear()
    await notifyAccountStatus('u1', 'active')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('renders the reason verbatim in the plain-text body, even with $-sequences', async () => {
    // Regression: an earlier version reverse-replaced the escaped reason with
    // String.replace, so `$&`/`$\``/`$'` in a reason corrupted the text body.
    admin.__setUsers([{ uid: 'u1', email: 'u1@example.dev' }])
    await notifyAccountStatus('u1', 'suspended', 'Posted spam $& scam <link>')
    expect(sentArg().text).toContain('Reason: Posted spam $& scam <link>')
    // HTML escapes the angle brackets but keeps the literal text.
    expect(sentArg().html).toContain('Posted spam $&amp; scam &lt;link&gt;')
  })

  it('recipeHidden mails the owner with the recipe title', async () => {
    admin.__setUsers([{ uid: 'owner', email: 'owner@example.dev' }])
    await notifyRecipeHidden('owner', 'Spicy Noodles')
    expect(sentArg().to).toBe('owner@example.dev')
    expect(sentArg().html).toMatch(/Spicy Noodles/)
  })

  it('reviewTakenDown resolves the owner via the usernames collection', async () => {
    const db = getDB()
    await seedUser('chef-uid', 'chef')
    await seedRecipe({ _id: 'r1', title: 'Pad Thai', userId: 'someone' })
    admin.__setUsers([{ uid: 'chef-uid', email: 'chef@example.dev' }])

    await notifyReviewTakenDown(db, 'chef', 'r1')
    expect(sentArg().to).toBe('chef@example.dev')
    expect(sentArg().html).toMatch(/Pad Thai/)
  })
})

describe('failures never throw', () => {
  it('resolves (does not reject) when the provider send throws', async () => {
    admin.__setUsers([{ uid: 'reporter', email: 'reporter@example.dev' }])
    sendMock.mockRejectedValueOnce(new Error('provider down'))
    await expect(notifyReportResolved('reporter')).resolves.toBeUndefined()
  })

  it('treats a resolved { error } payload as a failure, not a success', async () => {
    // Resend returns 4xx as { data: null, error } WITHOUT throwing — the wrapper
    // must surface sent:false rather than reporting a phantom success.
    admin.__setUsers([{ uid: 'reporter', email: 'reporter@example.dev' }])
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { statusCode: 403, message: 'You can only send testing emails to your own address' },
    })
    const res = await sendEmail({ to: 'reporter@example.dev', subject: 's', text: 't' })
    expect(res.sent).toBe(false)
    expect(res.error).toMatch(/testing emails/)
  })

  it('resolves when the recipient lookup itself throws', async () => {
    // A db whose findOne rejects — emailForUsername must swallow it.
    const brokenDb = { collection: () => ({ findOne: () => Promise.reject(new Error('db down')) }) }
    await expect(notifyReviewTakenDown(brokenDb, 'chef', 'r1')).resolves.toBeUndefined()
    expect(sendMock).not.toHaveBeenCalled()
  })
})

describe('moderation routes trigger the right sends', () => {
  it('suspending a user emails them and returns 200', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'target', email: 'target@example.dev' },
    ])
    await seedUser('target', 'targetuser')

    const res = await request(app)
      .patch('/api/admin/users/target/status')
      .set(AUTH_HEADER)
      .send({ status: 'suspended', reason: 'abuse' })

    expect(res.status).toBe(200)
    await flushNotifications()
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sentArg().to).toBe('target@example.dev')
  })

  it('a failing send does not fail the suspend request', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'target', email: 'target@example.dev' },
    ])
    await seedUser('target', 'targetuser')
    sendMock.mockRejectedValueOnce(new Error('provider down'))

    const res = await request(app)
      .patch('/api/admin/users/target/status')
      .set(AUTH_HEADER)
      .send({ status: 'banned', reason: 'abuse' })

    expect(res.status).toBe(200)
  })

  it('resolving a report emails the reporter; dismissing does not', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'reporter', email: 'reporter@example.dev' },
    ])
    const db = getDB()

    const mkReport = async () => {
      const _id = new ObjectId()
      await db.collection('reports').insertOne({
        _id,
        targetType: 'recipe',
        recipeId: 'recipe-1',
        reporterUid: 'reporter',
        reason: 'spam',
        status: 'open',
        createdAt: new Date(),
      })
      return _id
    }

    const resolveId = await mkReport()
    await request(app)
      .patch(`/api/reports/${resolveId}`)
      .set(AUTH_HEADER)
      .send({ status: 'resolved' })
    await flushNotifications()
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sentArg().to).toBe('reporter@example.dev')

    sendMock.mockClear()
    const dismissId = await mkReport()
    await request(app)
      .patch(`/api/reports/${dismissId}`)
      .set(AUTH_HEADER)
      .send({ status: 'dismissed' })
    await flushNotifications()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('a bulk resolve emails each distinct reporter once', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'reporterA', email: 'a@example.dev' },
      { uid: 'reporterB', email: 'b@example.dev' },
    ])
    const db = getDB()
    const ids = [
      { reporterUid: 'reporterA' },
      { reporterUid: 'reporterA' }, // same reporter, two reports ⇒ one email
      { reporterUid: 'reporterB' },
    ].map((r) => {
      const _id = new ObjectId()
      return { ...r, _id }
    })
    await db.collection('reports').insertMany(
      ids.map((r) => ({
        _id: r._id,
        targetType: 'recipe',
        recipeId: 'recipe-1',
        reporterUid: r.reporterUid,
        reason: 'spam',
        status: 'open',
        createdAt: new Date(),
      }))
    )

    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids: ids.map((r) => String(r._id)), status: 'resolved' })

    expect(res.status).toBe(200)
    await flushNotifications()
    expect(sendMock).toHaveBeenCalledTimes(2) // deduped to A + B
    const recipients = sendMock.mock.calls.map((c) => c[0].to).sort()
    expect(recipients).toEqual(['a@example.dev', 'b@example.dev'])
  })

  it('unhiding a recipe does not email (only takedowns notify)', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([{ uid: TEST_UID, email: 'admin@test.dev', admin: true }])
    await seedRecipe({ _id: 'r1', title: 'Dish', userId: 'owner', status: 'hidden' })

    const res = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'active' })

    expect(res.status).toBe(200)
    await flushNotifications()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('hiding a recipe emails the owner (resolved from updated.userId)', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'owner', email: 'owner@example.dev' },
    ])
    await seedRecipe({ _id: 'r1', title: 'Dish', userId: 'owner', status: 'active' })

    const res = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'hidden' })

    expect(res.status).toBe(200)
    await flushNotifications()
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sentArg().to).toBe('owner@example.dev')
  })

  it('taking down a review emails the author; restoring does not', async () => {
    admin.__setClaims({ admin: true })
    admin.__setUsers([
      { uid: TEST_UID, email: 'admin@test.dev', admin: true },
      { uid: 'author-uid', email: 'author@example.dev' },
    ])
    const db = getDB()
    await seedUser('author-uid', 'author')
    await seedRecipe({ _id: 'r1', title: 'Dish', userId: 'someone' })
    await seedRating({ username: 'author', recipeId: 'r1', rating: 4, reviewText: 'bad' })

    const takedown = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'author', moderationHidden: true })
    expect(takedown.status).toBe(200)
    await flushNotifications()
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sentArg().to).toBe('author@example.dev')

    sendMock.mockClear()
    const restore = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'author', moderationHidden: false })
    expect(restore.status).toBe(200)
    await flushNotifications()
    expect(sendMock).not.toHaveBeenCalled()
  })
})
