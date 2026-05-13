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
  beforeEach(async () => {
    await seedUser(TEST_UID, 'testuser')
  })

  it('returns 400 if userId is missing', async () => {
    const res = await request(app).get('/api/getUsername')
    expect(res.status).toBe(400)
  })

  it('returns 400 if userId is the string "null"', async () => {
    const res = await request(app).get('/api/getUsername?userId=null')
    expect(res.status).toBe(400)
  })

  it('returns 404 if userId is not found', async () => {
    const res = await request(app).get('/api/getUsername?userId=unknown')
    expect(res.status).toBe(404)
  })

  it('returns the username for a valid userId', async () => {
    const res = await request(app).get(`/api/getUsername?userId=${TEST_UID}`)
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
