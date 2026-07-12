/**
 * P1 — automated text moderation wired into the write routes.
 *
 * util/textModeration.moderateText is mocked so each test drives a deterministic
 * verdict (high / medium / clean) without an API call; the REAL automod helper,
 * routes, visibility predicates, audit log and reports collection are exercised.
 *
 * Contract under test, per the design doc:
 *   - recipe  high   → 422 blocked, nothing persisted
 *   - recipe  medium → 201 saved as 'pending_review' + open automod report + audit
 *   - recipe  clean  → 201 normal, publicly visible
 *   - review / username / profile  high|medium → 422 blocked
 *   - public reads exclude 'pending_review'; the owner's own list includes it
 */

jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))
jest.mock('../util/imageModeration', () => ({ moderateImage: jest.fn() }))

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { moderateText } = require('../util/textModeration')
const { moderateImage } = require('../util/imageModeration')
const { SYSTEM_ACTOR } = require('../util/auditLog')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { seedRecipe, seedUser } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH = { Authorization: 'Bearer fake-test-token' }

const HIGH = { allowed: false, severity: 'high', reason: 'openai:hate:0.97', category: 'hate', source: 'openai' }
const MEDIUM = { allowed: false, severity: 'medium', reason: 'openai:harassment:0.60', category: 'harassment', source: 'openai' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }

// Image verdicts (same shape; source 'vision'/'error'). IMG_UNSCANNED models the
// fail-CLOSED path: a scan outage grades MEDIUM so the recipe is held / photo rejected.
const IMG_HIGH = { allowed: false, severity: 'high', reason: 'vision:adult:VERY_LIKELY', category: 'adult', source: 'vision' }
const IMG_MEDIUM = { allowed: false, severity: 'medium', reason: 'vision:racy:VERY_LIKELY', category: 'racy', source: 'vision' }
const IMG_CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'vision' }
const IMG_UNSCANNED = { allowed: false, severity: 'medium', reason: 'vision:unscanned', category: 'unscanned', source: 'error' }

// Minimal valid recipe payload (server stamps _id/userId/counters).
const RECIPE_BODY = {
  title: 'Tuscan Chicken Skillet',
  description: 'A great dish',
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: ['low-carb'],
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '1000000',
  // Real client shapes (src/types.ts): parsed-ingredient row + step row.
  ingredients: [
    {
      id: 'i1',
      parsedIngredient: { ingredient: 'chicken', originalIngredientString: '1 lb chicken', comment: null },
      ingredientData: { name: 'chicken' },
    },
  ],
  instructions: [{ content: 'Cook the chicken', index: 0, id: 's1' }],
  recipeImage: 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ft.jpg?alt=media&token=abc',
}

// content.blocked audit rows are written fire-and-forget by respondBlocked (so a
// logging hiccup can never turn a block into a 500), so poll briefly for the row
// rather than asserting synchronously the instant the 422 lands.
const waitFor = async (fn, { tries = 50, gap = 10 } = {}) => {
  for (let i = 0; i < tries; i++) {
    const v = await fn()
    if (v) return v
    await new Promise((r) => setTimeout(r, gap))
  }
  return null
}

beforeEach(() => {
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
  moderateImage.mockReset()
  moderateImage.mockResolvedValue(IMG_CLEAN)
  admin.__updateUser.mockClear()
})

// addRecipe derives authorUsername from the caller's uid→username mapping (audit
// M3), so the create-path tests need a usernames doc for TEST_UID or they'd 400
// before reaching the moderation tiers under test. Scoped to the two create
// describes (the reviews/profile describes seed their own user via seedUser).
const seedCreatorUsername = () =>
  getDB().collection('usernames').updateOne(
    { _id: TEST_UID },
    { $set: { username: 'chef_test', username_lower: 'chef_test' } },
    { upsert: true }
  )

afterEach(async () => {
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('reports').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
    db.collection('userProfiles').deleteMany({}),
  ])
})

describe('POST /addRecipe — moderation tiers', () => {
  beforeEach(seedCreatorUsername)
  it('high confidence → 422 blocked, nothing persisted', async () => {
    moderateText.mockResolvedValue(HIGH)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    expect(await getDB().collection('recipes').countDocuments({})).toBe(0)
  })

  it('high block leaves a content.blocked audit row (system actor, offender as target)', async () => {
    moderateText.mockResolvedValue(HIGH)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(422)

    const db = getDB()
    const audit = await waitFor(() =>
      db.collection('auditLog').findOne({ action: 'content.blocked', 'metadata.surface': 'recipe' })
    )
    expect(audit).toMatchObject({
      action: 'content.blocked',
      actorType: 'system',
      actorUid: SYSTEM_ACTOR.uid,
      targetType: 'user',
      targetId: TEST_UID,
    })
    // Structured signal only — never the matched term / submitted text.
    expect(audit.metadata).toMatchObject({ surface: 'recipe', category: 'hate', severity: 'high', source: 'openai' })
  })

  it('medium confidence → 201 pending_review + open automod report + system audit', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(true)

    const db = getDB()
    const recipe = await db.collection('recipes').findOne(recipeIdQuery(res.body._id))
    expect(recipe.status).toBe('pending_review')

    const report = await db.collection('reports').findOne({ recipeId: String(res.body._id) })
    expect(report).toMatchObject({
      targetType: 'recipe',
      reporterUid: SYSTEM_ACTOR.uid,
      status: 'open',
      source: 'automod',
    })

    const audit = await db.collection('auditLog').findOne({ action: 'recipe.autohold' })
    expect(audit).toMatchObject({ actorType: 'system', actorUid: SYSTEM_ACTOR.uid, targetType: 'recipe' })
  })

  it('clean → 201 normal (no pending flag, no report)', async () => {
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(false)
    const recipe = await getDB().collection('recipes').findOne(recipeIdQuery(res.body._id))
    expect(recipe.status).toBeUndefined()
    expect(await getDB().collection('reports').countDocuments({})).toBe(0)
  })
})

describe('PUT /editRecipe — medium hold never downgrades an admin takedown', () => {
  it('medium edit of an active recipe → pending_review + automod report', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-active', userId: TEST_UID })
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).put('/api/editRecipe?recipeId=e-active').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(200)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery('e-active'))).status).toBe('pending_review')
    expect(await db.collection('reports').countDocuments({ recipeId: 'e-active', source: 'automod' })).toBe(1)
  })

  it('medium edit of an admin-hidden recipe keeps it hidden and files no automod report', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-hidden', userId: TEST_UID, status: 'hidden' })
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).put('/api/editRecipe?recipeId=e-hidden').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(200)
    const db = getDB()
    // Admin takedown preserved — not lifted to the weaker owner-visible pending state.
    expect((await db.collection('recipes').findOne(recipeIdQuery('e-hidden'))).status).toBe('hidden')
    expect(await db.collection('reports').countDocuments({ recipeId: 'e-hidden' })).toBe(0)
  })
})

describe('pending_review visibility split', () => {
  beforeEach(async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-public', userId: TEST_UID, title: 'Public Pasta' })
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-pending', userId: TEST_UID, title: 'Held Pasta', status: 'pending_review' })
  })

  it('public GET /recipes excludes pending_review', async () => {
    const res = await request(app).get('/api/recipes')
    const ids = res.body.recipeList.map((r) => r._id)
    expect(ids).toContain('r-public')
    expect(ids).not.toContain('r-pending')
  })

  it("owner GET /getCreatedRecipes includes their own pending_review", async () => {
    const res = await request(app).get('/api/getCreatedRecipes').set(AUTH)
    const ids = res.body.recipes.map((r) => r._id)
    expect(ids).toContain('r-public')
    expect(ids).toContain('r-pending')
  })

  it('owner GET /getRecipe can view their own pending_review recipe', async () => {
    const res = await request(app).get('/api/getRecipe?id=r-pending').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe('r-pending')
  })

  it('anonymous GET /getRecipe on a pending_review recipe is 404', async () => {
    const res = await request(app).get('/api/getRecipe?id=r-pending')
    expect(res.status).toBe(404)
  })
})

describe('reviews — high|medium both block', () => {
  beforeEach(async () => {
    await seedUser(TEST_UID, 'chef_test')
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-1', userId: 'someone-else' })
  })

  it('medium review → 422 (no owner-only state)', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/newReview').set(AUTH).send({ recipeId: 'r-1', reviewText: 'borderline' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    expect(await getDB().collection('ratings').countDocuments({})).toBe(0)
  })

  it('clean review → 200 persisted', async () => {
    const res = await request(app).post('/api/newReview').set(AUTH).send({ recipeId: 'r-1', reviewText: 'lovely dish' })
    expect(res.status).toBe(200)
    expect(await getDB().collection('ratings').countDocuments({ userId: TEST_UID, recipeId: 'r-1' })).toBe(1)
  })

  it('medium edit → 422 and the stored review text is unchanged', async () => {
    await getDB().collection('ratings').insertOne({
      userId: TEST_UID,
      username: 'chef_test',
      recipeId: 'r-1',
      rating: 4,
      reviewText: 'original text',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/editReview').set(AUTH).send({ recipeId: 'r-1', text: 'borderline edit' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    const stored = await getDB().collection('ratings').findOne({ userId: TEST_UID, recipeId: 'r-1' })
    expect(stored.reviewText).toBe('original text')
  })
})

describe('username + profile blocking', () => {
  it('high-confidence username → 422', async () => {
    moderateText.mockResolvedValue(HIGH)
    const res = await request(app).post('/api/setUsername?username=badword').set(AUTH)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
  })

  it('medium-confidence bio → 422', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/updateProfile').set(AUTH).send({ bio: 'borderline bio', location: 'NY' })
    expect(res.status).toBe(422)
    expect(await getDB().collection('userProfiles').countDocuments({})).toBe(0)
  })

  it('clean username → 200', async () => {
    const res = await request(app).post('/api/setUsername?username=cleanchef').set(AUTH)
    expect(res.status).toBe(200)
  })
})

describe('fail-open at the route layer', () => {
  beforeEach(seedCreatorUsername)
  it('classifier-disabled/error verdict (clean) lets the recipe save', async () => {
    moderateText.mockResolvedValue({ ...CLEAN, source: 'error' })
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(false)
  })
})

// ── P2: image moderation, collapsed with the text verdict on the recipe path ──

describe('POST /addRecipe — image moderation tiers (text clean)', () => {
  beforeEach(seedCreatorUsername)
  it('high-confidence image → 422 blocked, nothing persisted', async () => {
    moderateImage.mockResolvedValue(IMG_HIGH)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    expect(await getDB().collection('recipes').countDocuments({})).toBe(0)
  })

  it('medium-confidence image → 201 pending_review + automod report (image reason)', async () => {
    moderateImage.mockResolvedValue(IMG_MEDIUM)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(true)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery(res.body._id))).status).toBe('pending_review')
    const report = await db.collection('reports').findOne({ recipeId: String(res.body._id) })
    expect(report.classifier.reason).toBe('vision:racy:VERY_LIKELY')
  })

  it('image fails CLOSED: an unscanned (scan-error) image holds the recipe', async () => {
    moderateImage.mockResolvedValue(IMG_UNSCANNED)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(true)
    expect((await getDB().collection('recipes').findOne(recipeIdQuery(res.body._id))).status).toBe('pending_review')
  })

  it('worst-of: clean image + high text still blocks', async () => {
    moderateText.mockResolvedValue(HIGH)
    moderateImage.mockResolvedValue(IMG_CLEAN)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(422)
  })
})

describe('PUT /editRecipe — image only re-scanned when it changed', () => {
  it('does not scan the image when the URL is unchanged', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-img', userId: TEST_UID })
    const res = await request(app).put('/api/editRecipe?recipeId=e-img').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(200)
    // Same recipeImage as the seeded doc → image axis skipped (empty URL → not called).
    expect(moderateImage).toHaveBeenCalledWith(null, 'recipe.image')
  })

  it('scans (and can block on) a changed image URL', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-img2', userId: TEST_UID })
    moderateImage.mockResolvedValue(IMG_HIGH)
    const changed = { ...RECIPE_BODY, recipeImage: 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2FNEW.jpg?alt=media&token=z' }
    const res = await request(app).put('/api/editRecipe?recipeId=e-img2').set(AUTH).send(changed)
    expect(res.status).toBe(422)
    expect(moderateImage).toHaveBeenCalledWith(changed.recipeImage, 'recipe.image')
  })
})

describe('POST /updatePhoto — profile photo moderation', () => {
  const PHOTO = 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/profilePhotos%2Ftest-uid?alt=media&token=p'

  it('clean photo → 200 and applied to Firebase Auth', async () => {
    const res = await request(app).post('/api/updatePhoto').set(AUTH).send({ photoURL: PHOTO })
    expect(res.status).toBe(200)
    expect(admin.__updateUser).toHaveBeenCalledWith('test-uid', { photoURL: PHOTO })
  })

  it('high|medium|fail-closed photo → 422 and NOT applied', async () => {
    for (const verdict of [IMG_HIGH, IMG_MEDIUM, IMG_UNSCANNED]) {
      admin.__updateUser.mockClear()
      moderateImage.mockResolvedValue(verdict)
      const res = await request(app).post('/api/updatePhoto').set(AUTH).send({ photoURL: PHOTO })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('CONTENT_BLOCKED')
      expect(admin.__updateUser).not.toHaveBeenCalled()
    }
  })

  it('clearing the photo (empty URL) needs no scan and clears via null', async () => {
    const res = await request(app).post('/api/updatePhoto').set(AUTH).send({ photoURL: '' })
    expect(res.status).toBe(200)
    expect(moderateImage).not.toHaveBeenCalled()
    expect(admin.__updateUser).toHaveBeenCalledWith('test-uid', { photoURL: null })
  })
})

describe('POST /updateDisplayName — display name moderation', () => {
  it('clean name → 200 and applied (trimmed) to Firebase Auth', async () => {
    const res = await request(app).post('/api/updateDisplayName').set(AUTH).send({ displayName: '  Jane Cook  ' })
    expect(res.status).toBe(200)
    expect(admin.__updateUser).toHaveBeenCalledWith('test-uid', { displayName: 'Jane Cook' })
  })

  it('high|medium name → 422 and NOT applied (both tiers block, like a username)', async () => {
    for (const verdict of [HIGH, MEDIUM]) {
      admin.__updateUser.mockClear()
      moderateText.mockResolvedValue(verdict)
      const res = await request(app).post('/api/updateDisplayName').set(AUTH).send({ displayName: 'bad name' })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('CONTENT_BLOCKED')
      expect(admin.__updateUser).not.toHaveBeenCalled()
    }
  })

  it('empty/whitespace name → 400 and never scanned or applied', async () => {
    const res = await request(app).post('/api/updateDisplayName').set(AUTH).send({ displayName: '   ' })
    expect(res.status).toBe(400)
    expect(moderateText).not.toHaveBeenCalled()
    expect(admin.__updateUser).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/recipes/:id/approve — clear an automated hold', () => {
  // Reproduce the exact state holdRecipeForReview leaves behind: a pending_review
  // recipe with one OPEN system-filed automod report.
  const seedHeld = async (id = 'held') => {
    await seedRecipe({ ...RECIPE_BODY, _id: id, userId: 'owner', status: 'pending_review' })
    await getDB().collection('reports').insertOne({
      targetType: 'recipe',
      recipeId: id,
      reporterUid: SYSTEM_ACTOR.uid,
      reason: 'inappropriate',
      status: 'open',
      source: 'automod',
      classifier: { severity: 'medium', category: 'harassment', reason: 'openai:harassment:0.60', source: 'openai' },
      createdAt: new Date(),
    })
  }

  it('requires admin', async () => {
    await seedHeld()
    const res = await request(app).patch('/api/admin/recipes/held/approve').set(AUTH)
    expect(res.status).toBe(403)
  })

  it('publishes the held recipe, dismisses its open automod report, and audits the approval', async () => {
    admin.__setClaims({ admin: true })
    await seedHeld()

    const res = await request(app).patch('/api/admin/recipes/held/approve').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('active')

    const db = getDB()
    const recipe = await db.collection('recipes').findOne(recipeIdQuery('held'))
    expect(recipe.status).toBe('active')
    expect(recipe.moderatedBy).toBe(TEST_UID)

    const report = await db.collection('reports').findOne({ recipeId: 'held', source: 'automod' })
    expect(report.status).toBe('dismissed')
    expect(report.resolvedBy).toBe(TEST_UID)

    const audit = await db.collection('auditLog').findOne({ action: 'recipe.approve' })
    expect(audit).toMatchObject({ actorUid: TEST_UID, targetType: 'recipe', targetId: 'held' })
  })

  it('is 409 and a no-op when the recipe is not pending_review (never clobbers active/hidden)', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...RECIPE_BODY, _id: 'live', userId: 'owner' }) // no status field = active

    const res = await request(app).patch('/api/admin/recipes/live/approve').set(AUTH)
    expect(res.status).toBe(409)
    const recipe = await getDB().collection('recipes').findOne(recipeIdQuery('live'))
    expect(recipe.status).toBeUndefined() // untouched
    expect(await getDB().collection('auditLog').countDocuments({ action: 'recipe.approve' })).toBe(0)
  })

  it('is 409 for a recipe that does not exist', async () => {
    admin.__setClaims({ admin: true })
    const res = await request(app).patch('/api/admin/recipes/nope/approve').set(AUTH)
    expect(res.status).toBe(409)
  })
})

// A recipe hold lives in TWO places — the recipe's 'pending_review' status AND an
// OPEN automod report. Closing the report directly from the queue (rather than via
// the approve endpoint) must not strand the recipe invisible forever, so the report
// routes restore any held recipe whose automod report they close.
describe('report-close strand guard — closing an automod hold restores the recipe', () => {
  // Reproduce holdRecipeForReview's output and return the report _id so we can PATCH it.
  const seedHeld = async (id, status = 'pending_review') => {
    await seedRecipe({ ...RECIPE_BODY, _id: id, userId: 'owner', status })
    const { insertedId } = await getDB().collection('reports').insertOne({
      targetType: 'recipe',
      recipeId: id,
      reporterUid: SYSTEM_ACTOR.uid,
      reason: 'inappropriate',
      status: 'open',
      source: 'automod',
      classifier: { severity: 'medium', category: 'harassment', reason: 'openai:harassment:0.60', source: 'openai' },
      createdAt: new Date(),
    })
    return insertedId
  }

  beforeEach(() => admin.__setClaims({ admin: true }))

  it('PATCH /reports/:id dismiss of an automod hold restores the recipe to active', async () => {
    const reportId = await seedHeld('held-1')
    const res = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set(AUTH)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(200)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery('held-1'))).status).toBe('active')
    // The shared restore helper writes the recipe.approve audit row.
    expect(await db.collection('auditLog').countDocuments({ action: 'recipe.approve', targetId: 'held-1' })).toBe(1)
  })

  it('PATCH /reports/:id resolve of an automod hold also restores the recipe (no strand on either resolution)', async () => {
    const reportId = await seedHeld('held-2')
    const res = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set(AUTH)
      .send({ status: 'resolved' })
    expect(res.status).toBe(200)
    expect((await getDB().collection('recipes').findOne(recipeIdQuery('held-2'))).status).toBe('active')
  })

  it('does NOT restore a recipe an admin separately took down (hidden) — only genuine pending_review strays', async () => {
    const reportId = await seedHeld('hidden-1', 'hidden')
    const res = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set(AUTH)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(200)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery('hidden-1'))).status).toBe('hidden')
    expect(await db.collection('auditLog').countDocuments({ action: 'recipe.approve' })).toBe(0)
  })

  it('a user-filed (non-automod) report close touches no recipe status', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-user', userId: 'owner' }) // active (no status)
    const { insertedId: reportId } = await getDB().collection('reports').insertOne({
      targetType: 'recipe', recipeId: 'r-user', reporterUid: 'some-user', reason: 'spam', status: 'open', createdAt: new Date(),
    })
    const res = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set(AUTH)
      .send({ status: 'dismissed' })
    expect(res.status).toBe(200)
    expect(await getDB().collection('auditLog').countDocuments({ action: 'recipe.approve' })).toBe(0)
  })

  it('PATCH /reports/bulk restores every held recipe whose automod report it closes', async () => {
    const id1 = await seedHeld('bulk-1')
    const id2 = await seedHeld('bulk-2')
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH)
      .send({ ids: [String(id1), String(id2)], status: 'dismissed' })
    expect(res.status).toBe(200)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery('bulk-1'))).status).toBe('active')
    expect((await db.collection('recipes').findOne(recipeIdQuery('bulk-2'))).status).toBe('active')
  })
})
