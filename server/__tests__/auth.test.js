const request = require('supertest')
const admin = require('firebase-admin')
const app = require('../app')
const { getDB } = require('../db')
const { seedUser } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('usernames').deleteMany({}),
    db.collection('userProfiles').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('recipeDrafts').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('reports').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
  ])
  admin.__deleteUser.mockClear()
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

  it.each([
    ['john@smith', '@'],
    ['john/smith', 'slash'],
    ['john!', 'punctuation'],
    ['héllo', 'accented letter'],
    ['ab😀cd', 'emoji'],
  ])('rejects a username with a disallowed character: %s (%s)', async (username) => {
    const res = await request(app)
      .post(`/api/setUsername?username=${encodeURIComponent(username)}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/letters, numbers/i)
  })

  it.each([
    'john_smith',
    'john.smith',
    'john-smith',
    'JohnSmith99',
    'a_b-c.d',
  ])('accepts a username using only the allowed character set: %s', async (username) => {
    const res = await request(app)
      .post(`/api/setUsername?username=${encodeURIComponent(username)}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })
    await getDB().collection('usernames').deleteMany({})
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

  // Reviews (ratings) and review reports denormalize the username, so a rename
  // must carry across or a user's existing reviews keep the old handle.
  describe('rename propagation', () => {
    it("rewrites the user's ratings to the new username", async () => {
      await seedUser(TEST_UID, 'oldname')
      const db = getDB()
      await db
        .collection('ratings')
        .insertOne({ username: 'oldname', recipeId: 'r1', rating: 5 })

      const res = await request(app)
        .post('/api/setUsername?username=newname')
        .set(AUTH_HEADER)
      expect(res.status).toBe(200)

      expect(
        await db.collection('ratings').findOne({ username: 'oldname' })
      ).toBeNull()
      const moved = await db
        .collection('ratings')
        .findOne({ username: 'newname' })
      expect(moved.recipeId).toBe('r1')
    })

    it('rewrites reportedUsername on open review reports', async () => {
      await seedUser(TEST_UID, 'oldname')
      const db = getDB()
      await db.collection('reports').insertOne({
        targetType: 'review',
        reportedUsername: 'oldname',
        recipeId: 'r1',
        status: 'open',
      })

      await request(app)
        .post('/api/setUsername?username=newname')
        .set(AUTH_HEADER)

      const report = await db.collection('reports').findOne({ recipeId: 'r1' })
      expect(report.reportedUsername).toBe('newname')
    })

    it('leaves other users\' ratings untouched', async () => {
      await seedUser(TEST_UID, 'oldname')
      const db = getDB()
      await db
        .collection('ratings')
        .insertOne({ username: 'someoneelse', recipeId: 'r1', rating: 3 })

      await request(app)
        .post('/api/setUsername?username=newname')
        .set(AUTH_HEADER)

      const other = await db
        .collection('ratings')
        .findOne({ username: 'someoneelse' })
      expect(other).not.toBeNull()
    })

    it('does not touch ratings when the name is unchanged', async () => {
      await seedUser(TEST_UID, 'samename')
      const db = getDB()
      await db
        .collection('ratings')
        .insertOne({ username: 'samename', recipeId: 'r1', rating: 5 })

      await request(app)
        .post('/api/setUsername?username=samename')
        .set(AUTH_HEADER)

      const still = await db
        .collection('ratings')
        .findOne({ username: 'samename' })
      expect(still).not.toBeNull()
    })
  })
})

// ─── GET /getProfile ──────────────────────────────────────────────────────────

describe('GET /getProfile', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getProfile')
    expect(res.status).toBe(401)
  })

  it('returns empty strings and public defaults when the user has no profile yet', async () => {
    const res = await request(app).get('/api/getProfile').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      bio: '',
      location: '',
      isPublic: true,
      hideLocation: false,
    })
  })

  it("returns the authenticated user's own bio and location", async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'I cook', location: 'Portland, OR' })

    const res = await request(app).get('/api/getProfile').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.bio).toBe('I cook')
    expect(res.body.location).toBe('Portland, OR')
  })

  it('returns stored privacy toggles when set', async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, isPublic: false, hideLocation: true })

    const res = await request(app).get('/api/getProfile').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.isPublic).toBe(false)
    expect(res.body.hideLocation).toBe(true)
  })

  it("does not leak another user's profile", async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: 'other-uid', bio: 'secret', location: 'NYC' })

    const res = await request(app).get('/api/getProfile').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.bio).toBe('')
    expect(res.body.location).toBe('')
  })
})

// ─── POST /updateProfile ─────────────────────────────────────────────────────

describe('POST /updateProfile', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .send({ bio: 'hi', location: 'here' })
    expect(res.status).toBe(401)
  })

  it('upserts bio + location and returns success', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 'Home cook', location: 'Portland, OR' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })

    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('Home cook')
    expect(doc.location).toBe('Portland, OR')
    expect(doc.updatedAt).toBeInstanceOf(Date)
  })

  it('trims whitespace from stored values', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: '  spaced  ', location: '  Portland  ' })

    expect(res.status).toBe(200)
    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('spaced')
    expect(doc.location).toBe('Portland')
  })

  it('allows empty strings, clearing the fields', async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'old', location: 'old' })

    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: '', location: '' })

    expect(res.status).toBe(200)
    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('')
    expect(doc.location).toBe('')
  })

  it('treats missing fields as empty', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({})

    expect(res.status).toBe(200)
    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('')
    expect(doc.location).toBe('')
  })

  it('updates an existing profile in place (single doc per uid)', async () => {
    await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 'first', location: 'A' })
    await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 'second', location: 'B' })

    const docs = await getDB()
      .collection('userProfiles')
      .find({ _id: TEST_UID })
      .toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].bio).toBe('second')
    expect(docs[0].location).toBe('B')
  })

  it('rejects a bio longer than 300 characters (400)', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 'a'.repeat(301), location: '' })

    expect(res.status).toBe(400)
  })

  it('rejects a location longer than 80 characters (400)', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: '', location: 'a'.repeat(81) })

    expect(res.status).toBe(400)
  })

  it('rejects a non-string bio (400)', async () => {
    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 123, location: '' })

    expect(res.status).toBe(400)
  })

  it('blocks a suspended user from editing their profile (403)', async () => {
    await getDB()
      .collection('users')
      .insertOne({ _id: TEST_UID, status: 'suspended' })

    const res = await request(app)
      .post('/api/updateProfile')
      .set(AUTH_HEADER)
      .send({ bio: 'sneaky edit', location: '' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED')
  })
})

// ─── POST /updatePrivacy ─────────────────────────────────────────────────────

describe('POST /updatePrivacy', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/api/updatePrivacy')
      .send({ isPublic: false, hideLocation: true })
    expect(res.status).toBe(401)
  })

  it('upserts both toggles and returns success', async () => {
    const res = await request(app)
      .post('/api/updatePrivacy')
      .set(AUTH_HEADER)
      .send({ isPublic: false, hideLocation: true })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })

    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.isPublic).toBe(false)
    expect(doc.hideLocation).toBe(true)
    expect(doc.updatedAt).toBeInstanceOf(Date)
  })

  it('does not clobber existing bio/location', async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'keep me', location: 'PDX' })

    await request(app)
      .post('/api/updatePrivacy')
      .set(AUTH_HEADER)
      .send({ isPublic: false, hideLocation: false })

    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('keep me')
    expect(doc.location).toBe('PDX')
  })

  it('rejects a non-boolean isPublic (400)', async () => {
    const res = await request(app)
      .post('/api/updatePrivacy')
      .set(AUTH_HEADER)
      .send({ isPublic: 'yes', hideLocation: false })
    expect(res.status).toBe(400)
  })

  it('rejects a missing hideLocation (400)', async () => {
    const res = await request(app)
      .post('/api/updatePrivacy')
      .set(AUTH_HEADER)
      .send({ isPublic: true })
    expect(res.status).toBe(400)
  })

  it('blocks a banned user from changing privacy (403)', async () => {
    await getDB()
      .collection('users')
      .insertOne({ _id: TEST_UID, status: 'banned' })

    const res = await request(app)
      .post('/api/updatePrivacy')
      .set(AUTH_HEADER)
      .send({ isPublic: true, hideLocation: false })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCOUNT_BANNED')
  })
})

// ─── GET /exportMyData ───────────────────────────────────────────────────────

describe('GET /exportMyData', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/exportMyData')
    expect(res.status).toBe(401)
  })

  it('returns the full data shape as a JSON attachment', async () => {
    await seedUser(TEST_UID, 'exporter')
    const db = getDB()
    await db
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'hi', location: 'PDX' })
    await db
      .collection('userRecipeData')
      .insertOne({ _id: TEST_UID, savedRecipes: [{ recipeId: 'r1' }] })
    await db.collection('recipes').insertOne({ _id: 'r9', userId: TEST_UID })
    await db
      .collection('recipeDrafts')
      .insertOne({ _id: 'd1', userId: TEST_UID })
    await db
      .collection('ratings')
      .insertOne({ userId: TEST_UID, username: 'exporter', recipeId: 'r1', rating: 5 })

    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    expect(res.body.username).toBe('exporter')
    expect(res.body.profile.bio).toBe('hi')
    expect(res.body.savedRecipes).toHaveLength(1)
    expect(res.body.recipes.map(r => r._id)).toEqual(['r9'])
    expect(res.body.drafts.map(d => d._id)).toEqual(['d1'])
    expect(res.body.ratings).toHaveLength(1)
  })

  it('handles a user with no data yet', async () => {
    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.username).toBeNull()
    expect(res.body.profile).toBeNull()
    expect(res.body.recipes).toEqual([])
    expect(res.body.ratings).toEqual([])
  })

  it('hydrates saved-recipe references into full recipe bodies', async () => {
    await seedUser(TEST_UID, 'saver')
    const db = getDB()
    // A live recipe the user saved (owned by someone else) + a dangling ref
    // whose recipe has since been deleted.
    await db
      .collection('recipes')
      .insertOne({ _id: 'saved-1', userId: 'other', title: 'Saved Soup', status: 'published' })
    await db.collection('userRecipeData').insertOne({
      _id: TEST_UID,
      savedRecipes: [
        { recipeId: 'saved-1', dateSaved: '100' },
        { recipeId: 'missing', dateSaved: '200' },
      ],
    })

    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)

    expect(res.status).toBe(200)
    const [hit, miss] = res.body.savedRecipes
    // Original save metadata is preserved on both entries.
    expect(hit.recipeId).toBe('saved-1')
    expect(hit.dateSaved).toBe('100')
    // The live recipe is hydrated into its full body...
    expect(hit.recipe.title).toBe('Saved Soup')
    // ...and a since-deleted one keeps its reference with recipe: null.
    expect(miss.recipeId).toBe('missing')
    expect(miss.dateSaved).toBe('200')
    expect(miss.recipe).toBeNull()
  })

  it('does not leak the body of a saved recipe that was later hidden', async () => {
    await seedUser(TEST_UID, 'saver')
    const db = getDB()
    await db
      .collection('recipes')
      .insertOne({ _id: 'hidden-1', userId: 'other', title: 'Gone', status: 'hidden' })
    await db
      .collection('userRecipeData')
      .insertOne({ _id: TEST_UID, savedRecipes: [{ recipeId: 'hidden-1', dateSaved: '1' }] })

    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)

    expect(res.body.savedRecipes).toHaveLength(1)
    expect(res.body.savedRecipes[0].recipeId).toBe('hidden-1')
    expect(res.body.savedRecipes[0].recipe).toBeNull()
  })

  it('does not leak another user\'s admin moderation stamps into the hydrated body', async () => {
    await seedUser(TEST_UID, 'saver')
    const db = getDB()
    // A saved recipe is someone else's recipe, and it may carry internal admin
    // stamps (admin Firebase uids) from a prior moderation/curation action. The
    // export must hydrate it through the public whitelist, not the raw doc.
    await db.collection('recipes').insertOne({
      _id: 'stamped-1',
      userId: 'other',
      title: 'Stamped Stew',
      status: 'published',
      ingredients: [{ name: 'water' }],
      moderatedBy: 'admin-uid-1',
      moderatedAt: '2026-01-01',
      featuredBy: 'admin-uid-2',
      featuredAt: '2026-01-02',
      publishUpdatedBy: 'admin-uid-3',
      publishUpdatedAt: '2026-01-03',
    })
    await db
      .collection('userRecipeData')
      .insertOne({ _id: TEST_UID, savedRecipes: [{ recipeId: 'stamped-1', dateSaved: '1' }] })

    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)

    const { recipe } = res.body.savedRecipes[0]
    // Public content still hydrates...
    expect(recipe.title).toBe('Stamped Stew')
    // ...but none of the six admin-uid moderation/curation stamps ride along.
    for (const field of [
      'moderatedBy',
      'moderatedAt',
      'featuredBy',
      'featuredAt',
      'publishUpdatedBy',
      'publishUpdatedAt',
    ]) {
      expect(recipe).not.toHaveProperty(field)
    }
  })

  it("strips admin moderation stamps from the user's OWN recipes and drafts", async () => {
    await seedUser(TEST_UID, 'exporter')
    const db = getDB()
    const STAMPS = {
      moderatedBy: 'admin-uid-1',
      moderatedAt: '2026-01-01',
      featuredBy: 'admin-uid-2',
      featuredAt: '2026-01-02',
      publishUpdatedBy: 'admin-uid-3',
      publishUpdatedAt: '2026-01-03',
    }
    // The user authored these, and an admin later moderated/featured them, so the
    // raw docs carry admin Firebase uids. `description` is a user-authored field
    // that is NOT in publicRecipeProjection — it must survive, proving the export
    // uses an exclusion projection (full body minus stamps), not the card whitelist.
    await db.collection('recipes').insertOne({
      _id: 'own-1',
      userId: TEST_UID,
      title: 'My Stew',
      description: 'a private note the whitelist would drop',
      ...STAMPS,
    })
    await db.collection('recipeDrafts').insertOne({
      _id: 'draft-1',
      userId: TEST_UID,
      title: 'My Draft',
      description: 'draft note',
      ...STAMPS,
    })

    const res = await request(app).get('/api/exportMyData').set(AUTH_HEADER)

    expect(res.status).toBe(200)
    const [ownRecipe] = res.body.recipes
    const [ownDraft] = res.body.drafts
    // Full authored body is preserved (including non-whitelist fields)...
    expect(ownRecipe.title).toBe('My Stew')
    expect(ownRecipe.description).toBe('a private note the whitelist would drop')
    expect(ownDraft.title).toBe('My Draft')
    // ...but none of the six admin-uid stamps ride along on either.
    for (const field of Object.keys(STAMPS)) {
      expect(ownRecipe).not.toHaveProperty(field)
      expect(ownDraft).not.toHaveProperty(field)
    }
  })
})

// ─── POST /deleteAccount ─────────────────────────────────────────────────────

describe('POST /deleteAccount', () => {
  const seedFullAccount = async () => {
    await seedUser(TEST_UID, 'goner')
    const db = getDB()
    await db
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'bye' })
    await db.collection('users').insertOne({ _id: TEST_UID, status: 'active' })
    await db
      .collection('userRecipeData')
      .insertOne({ _id: TEST_UID, savedRecipes: [] })
    await db.collection('recipes').insertOne({ _id: 'r1', userId: TEST_UID })
    await db
      .collection('recipeDrafts')
      .insertOne({ _id: 'd1', userId: TEST_UID })
    await db
      .collection('ratings')
      .insertOne({ userId: TEST_UID, username: 'goner', recipeId: 'r1', rating: 4 })
  }

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post('/api/deleteAccount')
    expect(res.status).toBe(401)
  })

  it('deletes the user across every collection and removes the Firebase account', async () => {
    await seedFullAccount()

    const res = await request(app).post('/api/deleteAccount').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true })

    const db = getDB()
    expect(await db.collection('usernames').findOne({ _id: TEST_UID })).toBeNull()
    expect(
      await db.collection('userProfiles').findOne({ _id: TEST_UID })
    ).toBeNull()
    expect(await db.collection('users').findOne({ _id: TEST_UID })).toBeNull()
    expect(
      await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    ).toBeNull()
    expect(await db.collection('recipes').findOne({ userId: TEST_UID })).toBeNull()
    expect(
      await db.collection('recipeDrafts').findOne({ userId: TEST_UID })
    ).toBeNull()
    // ratings are keyed by username, not uid.
    expect(
      await db.collection('ratings').findOne({ username: 'goner' })
    ).toBeNull()

    expect(admin.__deleteUser).toHaveBeenCalledWith(TEST_UID)
  })

  it('records the self-deletion in the audit log', async () => {
    await seedFullAccount()
    await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

    const entry = await getDB()
      .collection('auditLog')
      .findOne({ action: 'user.delete' })
    expect(entry).not.toBeNull()
    expect(entry.actorUid).toBe(TEST_UID)
    expect(entry.targetType).toBe('user')
    expect(entry.targetLabel).toBe('@goner')
    // Self-service, not an admin action: stamped 'user' so the audit feed reads
    // "@goner deleted their account" rather than "An admin …".
    expect(entry.actorType).toBe('user')
    // The handle is captured on the row because the usernames doc was deleted in
    // the same cascade — read-time enrichment can no longer resolve actorUid.
    expect(entry.actorUsername).toBe('goner')
  })

  it('still deletes the Firebase account when the user has no other data', async () => {
    const res = await request(app).post('/api/deleteAccount').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(admin.__deleteUser).toHaveBeenCalledWith(TEST_UID)
  })

  // ── Cascade thoroughness (D2 / D4 / D5 / D6) ──────────────────────────────
  // The departing user (TEST_UID/'goner') OWNS recipe 'owned'. Another user
  // ('keeper') owns recipe 'kept' and has reviewed BOTH; the departing user has
  // also reviewed 'kept'. Exercises: other users' reviews of a deleted recipe,
  // dangling saved/made refs, surviving-recipe rating drift, and Storage leaks.
  describe('cascade (D2/D4/D5/D6)', () => {
    const KEEPER_UID = 'keeper-uid'

    // deleteProfilePhoto now skips when FIREBASE_STORAGE_BUCKET is unset (N7), so
    // set it here to exercise the D5 profile-photo deletion path; restore after.
    const ORIGINAL_BUCKET = process.env.FIREBASE_STORAGE_BUCKET
    beforeAll(() => {
      process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
    })
    afterAll(() => {
      if (ORIGINAL_BUCKET === undefined) delete process.env.FIREBASE_STORAGE_BUCKET
      else process.env.FIREBASE_STORAGE_BUCKET = ORIGINAL_BUCKET
    })

    const seedCascade = async () => {
      const db = getDB()
      await seedUser(TEST_UID, 'goner')
      await seedUser(KEEPER_UID, 'keeper')
      await db.collection('users').insertOne({ _id: TEST_UID, status: 'active' })

      // Departing user owns 'owned' (with an image); keeper owns 'kept'.
      await db.collection('recipes').insertMany([
        { _id: 'owned', userId: TEST_UID, recipeImage: 'https://firebasestorage.googleapis.com/v0/b/b/o/owned.jpg?alt=media&token=t' },
        { _id: 'kept', userId: KEEPER_UID, rating: { rateCount: 0, rateValue: 0 } },
      ])

      // keeper saved + made the departing user's recipe → must be pulled (D2/D6).
      await db.collection('userRecipeData').insertMany([
        { _id: TEST_UID, savedRecipes: [{ recipeId: 'kept' }], madeRecipes: [], userRecipes: [{ recipeId: 'owned' }] },
        { _id: KEEPER_UID, savedRecipes: [{ recipeId: 'owned' }], madeRecipes: [{ recipeId: 'owned' }], userRecipes: [{ recipeId: 'kept' }] },
      ])

      // Ratings: keeper reviewed BOTH; departing user reviewed 'kept'.
      await db.collection('ratings').insertMany([
        { userId: KEEPER_UID, username: 'keeper', recipeId: 'owned', rating: 5 },
        { userId: KEEPER_UID, username: 'keeper', recipeId: 'kept', rating: 4 },
        { userId: TEST_UID, username: 'goner', recipeId: 'kept', rating: 2 },
      ])
      // 'kept' currently averages keeper(4) + goner(2) = 3 over 2 ratings.
      await db.collection('recipes').updateOne({ _id: 'kept' }, { $set: { rating: { rateCount: 2, rateValue: 3 } } })
    }

    beforeEach(() => admin.__deleteFile.mockClear())

    it('removes other users\' ratings of the departing user\'s recipes (D2)', async () => {
      await seedCascade()
      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      const db = getDB()
      // keeper's review of the now-deleted 'owned' recipe must be gone.
      expect(await db.collection('ratings').countDocuments({ recipeId: 'owned' })).toBe(0)
    })

    it('pulls the deleted recipe from other users\' saved/made lists (D6)', async () => {
      await seedCascade()
      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      const keeper = await getDB().collection('userRecipeData').findOne({ _id: KEEPER_UID })
      expect(keeper.savedRecipes).toEqual([])
      expect(keeper.madeRecipes).toEqual([])
      // keeper's unrelated created list is untouched.
      expect(keeper.userRecipes).toEqual([{ recipeId: 'kept' }])
    })

    it('recomputes the aggregate of a surviving recipe the departing user reviewed (D4)', async () => {
      await seedCascade()
      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      const db = getDB()
      // goner's review of 'kept' is gone; only keeper(4) remains.
      expect(await db.collection('ratings').countDocuments({ recipeId: 'kept' })).toBe(1)
      const kept = await db.collection('recipes').findOne({ _id: 'kept' })
      expect(kept.rating).toEqual({
        rateCount: 1,
        rateValue: 4,
        breakdown: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 },
      })
    })

    it('deletes the departing user\'s recipe images and profile photo from Storage (D5)', async () => {
      await seedCascade()
      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      // One recipe image ('owned') + the profile photo (profilePhotos/{uid}).
      expect(admin.__deleteFile).toHaveBeenCalledTimes(2)
    })

    it('still completes the account delete if a Storage delete fails (best-effort)', async () => {
      await seedCascade()
      admin.__deleteFile.mockRejectedValueOnce(new Error('storage down'))

      const res = await request(app).post('/api/deleteAccount').set(AUTH_HEADER)
      expect(res.status).toBe(200)
      expect(admin.__deleteUser).toHaveBeenCalledWith(TEST_UID)
    })

    it('anonymizes reports the departing user filed, preserving the record (D6)', async () => {
      await seedCascade()
      const db = getDB()
      await db.collection('reports').insertOne({
        targetType: 'recipe',
        recipeId: 'kept',
        reporterUid: TEST_UID,
        reason: 'spam',
        status: 'open',
        createdAt: new Date(),
      })

      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      const report = await db.collection('reports').findOne({ recipeId: 'kept' })
      expect(report).not.toBeNull()
      expect(report.reporterUid).toBeNull()
    })

    it('leaves another user\'s own recipe and review intact', async () => {
      await seedCascade()
      await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

      const db = getDB()
      expect(await db.collection('recipes').findOne({ _id: 'kept' })).not.toBeNull()
      expect(
        await db.collection('ratings').findOne({ userId: KEEPER_UID, recipeId: 'kept' })
      ).not.toBeNull()
    })

    it('retries, alerts, and records a failed post-commit recompute instead of swallowing it', async () => {
      await seedCascade()
      // Force the surviving-recipe recompute ('kept') to fail on every attempt.
      const recipeRating = require('../util/recipeRating')
      const Sentry = require('@sentry/node')
      const recomputeSpy = jest
        .spyOn(recipeRating, 'recomputeRecipeRating')
        .mockRejectedValue(new Error('mongo down'))
      const sentrySpy = jest
        .spyOn(Sentry, 'captureException')
        .mockImplementation(() => {})

      try {
        const res = await request(app).post('/api/deleteAccount').set(AUTH_HEADER)

        // Best-effort: the account delete still completes despite the failure.
        expect(res.status).toBe(200)
        expect(admin.__deleteUser).toHaveBeenCalledWith(TEST_UID)
        // The one surviving reviewed recipe ('kept') is retried before giving up.
        expect(recomputeSpy).toHaveBeenCalledTimes(3)
        expect(recomputeSpy).toHaveBeenCalledWith(expect.anything(), 'kept')
        // Escalated to Sentry — not silently console.error'd.
        expect(sentrySpy).toHaveBeenCalledTimes(1)
        // And left a durable, queryable to-do on the audit entry for S6 reconciliation.
        const entry = await getDB()
          .collection('auditLog')
          .findOne({ action: 'user.delete' })
        expect(entry.metadata.staleRatingRecipeIds).toEqual(['kept'])
      } finally {
        recomputeSpy.mockRestore()
        sentrySpy.mockRestore()
      }
    })
  })
})
