const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { seedUser } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

afterEach(async () => {
  await getDB().collection('usernames').deleteMany({})
})

// ─── GET /getUsername ─────────────────────────────────────────────────────────

describe('GET /getUsername', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getUsername')
    expect(res.status).toBe(401)
  })

  it("returns the authenticated user's own username", async () => {
    await seedUser(TEST_UID, 'testuser')
    const res = await request(app).get('/api/getUsername').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toBe('testuser')
  })

  it('returns null when the authenticated user has no username yet', async () => {
    const res = await request(app).get('/api/getUsername').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('ignores a userId query param and only returns the caller\'s own username', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedUser('other-uid', 'otheruser')

    const res = await request(app)
      .get('/api/getUsername?userId=other-uid')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toBe('testuser')
  })
})

// ─── GET /checkUsernameAvailability ──────────────────────────────────────────

describe('GET /checkUsernameAvailability', () => {
  beforeEach(async () => {
    await seedUser(TEST_UID, 'taken')
  })

  it('returns 400 if username is missing', async () => {
    const res = await request(app).get('/api/checkUsernameAvailability')
    expect(res.status).toBe(400)
  })

  it('returns true if username is available', async () => {
    const res = await request(app).get('/api/checkUsernameAvailability?username=available')
    expect(res.status).toBe(200)
    expect(res.body).toBe(true)
  })

  it('returns false if username is already taken', async () => {
    const res = await request(app).get('/api/checkUsernameAvailability?username=taken')
    expect(res.status).toBe(200)
    expect(res.body).toBe(false)
  })

  it('treats availability case-insensitively', async () => {
    const res = await request(app).get('/api/checkUsernameAvailability?username=TAKEN')
    expect(res.status).toBe(200)
    expect(res.body).toBe(false)
  })
})

// ─── POST /setUsername ────────────────────────────────────────────────────────

describe('POST /setUsername', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post(`/api/setUsername?username=newuser`)
    expect(res.status).toBe(401)
  })

  it('returns 409 if username is taken by another user', async () => {
    await seedUser('other-uid', 'taken')

    const res = await request(app)
      .post(`/api/setUsername?username=taken`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/taken/i)
  })

  it('creates a new username entry and returns success', async () => {
    const res = await request(app)
      .post(`/api/setUsername?username=newuser`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })

    const doc = await getDB().collection('usernames').findOne({ _id: TEST_UID })
    expect(doc.username).toBe('newuser')
    expect(doc.username_lower).toBe('newuser')
  })

  it('stores a lowercased username_lower while preserving original casing', async () => {
    const res = await request(app)
      .post(`/api/setUsername?username=NewUser`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)

    const doc = await getDB().collection('usernames').findOne({ _id: TEST_UID })
    expect(doc.username).toBe('NewUser')
    expect(doc.username_lower).toBe('newuser')
  })

  it('returns 409 for a case-variant of a name taken by another user', async () => {
    await seedUser('other-uid', 'taken')

    const res = await request(app)
      .post(`/api/setUsername?username=TAKEN`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(409)
  })

  it('rejects a username with whitespace (400)', async () => {
    const res = await request(app)
      .post(`/api/setUsername?username=${encodeURIComponent('has space')}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
  })

  it('rejects a username shorter than 3 characters (400)', async () => {
    const res = await request(app)
      .post(`/api/setUsername?username=ab`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
  })

  it('rejects a username longer than 30 characters (400)', async () => {
    const res = await request(app)
      .post(`/api/setUsername?username=${'a'.repeat(31)}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
  })

  it('updates an existing username entry', async () => {
    await seedUser(TEST_UID, 'oldname')

    const res = await request(app)
      .post(`/api/setUsername?username=newname`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)

    const doc = await getDB().collection('usernames').findOne({ _id: TEST_UID })
    expect(doc.username).toBe('newname')
  })

  it('allows a user to set their existing username without conflict (409)', async () => {
    await seedUser(TEST_UID, 'myname')

    const res = await request(app)
      .post(`/api/setUsername?username=myname`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
  })
})
