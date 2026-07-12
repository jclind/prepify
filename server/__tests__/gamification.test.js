const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const {
  seedUser,
  seedRecipes,
  seedUserRecipeData,
  seedRating,
} = require('./helpers/seed')
const {
  computeXp,
  levelFromXp,
  rankForLevel,
  computeGamification,
} = require('../util/gamification')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// ─── Pure engine ─────────────────────────────────────────────────────────────

describe('gamification engine', () => {
  it('weights XP by recipes/ratings/saved (drafts earn nothing)', () => {
    expect(computeXp({ recipes: 1, ratings: 1, saved: 1, drafts: 99 })).toBe(
      120
    )
    expect(computeXp({ recipes: 2, ratings: 0, saved: 0 })).toBe(200)
  })

  it('maps XP to the level curve (0/100/300 boundaries)', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(299).level).toBe(2)
    expect(levelFromXp(300).level).toBe(3)
  })

  it('reports progress within the current level', () => {
    // 150 XP → level 2 (base 100), 50 into a 200-wide level → 25%.
    const { level, xpIntoLevel, xpForNext, pct } = levelFromXp(150)
    expect(level).toBe(2)
    expect(xpIntoLevel).toBe(50)
    expect(xpForNext).toBe(200)
    expect(pct).toBe(25)
  })

  it('names ranks by level band', () => {
    expect(rankForLevel(1)).toBe('New Cook')
    expect(rankForLevel(3)).toBe('Home Cook')
    expect(rankForLevel(5)).toBe('Seasoned Cook')
    expect(rankForLevel(7)).toBe('Chef')
    expect(rankForLevel(12)).toBe('Master Chef')
  })

  it('marks earned achievements and diffs newlyUnlocked against seen', () => {
    const counts = { recipes: 1, ratings: 1, saved: 1, drafts: 0 }
    const all = computeGamification(counts, [])
    expect(all.earned.sort()).toEqual(
      ['first_recipe', 'first_review', 'first_save'].sort()
    )
    expect(all.newlyUnlocked.sort()).toEqual(all.earned.sort())

    const partial = computeGamification(counts, ['first_save'])
    expect(partial.newlyUnlocked.sort()).toEqual(
      ['first_recipe', 'first_review'].sort()
    )
  })

  it('earns threshold achievements exactly at their cutoffs', () => {
    const earned = c => computeGamification(c, []).earned
    // collector: 25 saves
    expect(earned({ saved: 24, ratings: 0, recipes: 0 })).not.toContain(
      'collector'
    )
    expect(earned({ saved: 25, ratings: 0, recipes: 0 })).toContain('collector')
    // prolific: 10 recipes
    expect(earned({ saved: 0, ratings: 0, recipes: 9 })).not.toContain(
      'prolific'
    )
    expect(earned({ saved: 0, ratings: 0, recipes: 10 })).toContain('prolific')
    // critic: 10 reviews
    expect(earned({ saved: 0, ratings: 9, recipes: 0 })).not.toContain('critic')
    expect(earned({ saved: 0, ratings: 10, recipes: 0 })).toContain('critic')
  })
})

// ─── GET /getGamification ────────────────────────────────────────────────────

describe('GET /getGamification', () => {
  afterEach(async () => {
    const db = getDB()
    await Promise.all([
      db.collection('usernames').deleteMany({}),
      db.collection('userProfiles').deleteMany({}),
      db.collection('userRecipeData').deleteMany({}),
      db.collection('recipes').deleteMany({}),
      db.collection('ratings').deleteMany({}),
    ])
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getGamification')
    expect(res.status).toBe(401)
  })

  it('returns level 1 / no achievements for a brand-new user', async () => {
    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.level).toBe(1)
    expect(res.body.totalXp).toBe(0)
    expect(res.body.earned).toEqual([])
    expect(res.body.newlyUnlocked).toEqual([])
  })

  // Contract guard: the frontend Gamification type mocks this exact shape, so a
  // dropped/renamed field here would drift past the mocked FE tests. Pin it.
  it('returns exactly the gamification contract fields', async () => {
    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'achievements',
        'earned',
        'level',
        'newlyUnlocked',
        'pct',
        'rank',
        'totalXp',
        'xp',
        'xpNext',
      ].sort()
    )
  })

  it('derives level + achievements from the account counts', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 'c1', userId: TEST_UID },
      { _id: 'c2', userId: TEST_UID },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [{ recipeId: 'c1', dateSaved: '1' }],
    })
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c1', rating: 5, reviewText: 'Tasty!' })

    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // 2*100 + 1*15 + 1*5 = 220 XP → level 2.
    expect(res.body.totalXp).toBe(220)
    expect(res.body.level).toBe(2)
    expect(res.body.earned.sort()).toEqual(
      ['first_recipe', 'first_review', 'first_save'].sort()
    )
    expect(res.body.newlyUnlocked.sort()).toEqual(res.body.earned.sort())
  })

  it('does not count hidden/unpublished/pending recipes toward XP or achievements', async () => {
    // Only publicly-published recipes are "Published". A hidden/unpublished/held
    // recipe must neither grant recipe XP nor earn first_recipe/prolific.
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 'v1', userId: TEST_UID }, // legacy/no status → visible
      { _id: 'h1', userId: TEST_UID, status: 'hidden' },
      { _id: 'u1', userId: TEST_UID, status: 'unpublished' },
      { _id: 'p1', userId: TEST_UID, status: 'pending_review' },
    ])

    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // Only v1 counts: 1*100 XP.
    expect(res.body.totalXp).toBe(100)
    expect(res.body.earned).toContain('first_recipe')
  })

  it('does not count star-only ratings or moderation-hidden reviews toward review achievements', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([{ _id: 'c1', userId: TEST_UID }])
    // A star-only rating (no reviewText) is not a review.
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c1', rating: 5, reviewText: '' })
    // A written but admin-taken-down review is not a public review either.
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c2', rating: 4, reviewText: 'hi', moderationHidden: true })

    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // Neither rating counts as a review → no review XP, no first_review.
    expect(res.body.earned).not.toContain('first_review')
    // 1 recipe (100) + 0 reviews + 0 saves.
    expect(res.body.totalXp).toBe(100)
  })

  it('counts only still-visible saved recipes toward saved XP/achievements', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 's1', userId: 'other' },
      { _id: 's2', userId: 'other', status: 'hidden' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 's1', dateSaved: '1' },
        { recipeId: 's2', dateSaved: '2' }, // hidden → must not count
      ],
    })

    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // Only s1 is visible: 1*5 saved XP, no recipes/reviews.
    expect(res.body.totalXp).toBe(5)
    expect(res.body.earned).toContain('first_save')
  })

  it('omits already-acknowledged achievements from newlyUnlocked', async () => {
    await seedRecipes([{ _id: 'c1', userId: TEST_UID }])
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, seenAchievements: ['first_recipe'] })

    const res = await request(app).get('/api/getGamification').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.earned).toContain('first_recipe')
    expect(res.body.newlyUnlocked).not.toContain('first_recipe')
  })
})

// ─── POST /acknowledgeAchievements ───────────────────────────────────────────

describe('POST /acknowledgeAchievements', () => {
  afterEach(async () => {
    await getDB().collection('userProfiles').deleteMany({})
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/api/acknowledgeAchievements')
      .send({ ids: ['first_save'] })
    expect(res.status).toBe(401)
  })

  it('returns 400 when ids is not an array', async () => {
    const res = await request(app)
      .post('/api/acknowledgeAchievements')
      .set(AUTH_HEADER)
      .send({ ids: 'first_save' })
    expect(res.status).toBe(400)
  })

  it('stores valid ids and ignores unknown ones', async () => {
    const res = await request(app)
      .post('/api/acknowledgeAchievements')
      .set(AUTH_HEADER)
      .send({ ids: ['first_save', 'not_a_real_achievement'] })

    expect(res.status).toBe(200)
    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.seenAchievements).toEqual(['first_save'])
  })

  it('is idempotent (no duplicate ids on repeat calls)', async () => {
    const body = { ids: ['first_save'] }
    await request(app)
      .post('/api/acknowledgeAchievements')
      .set(AUTH_HEADER)
      .send(body)
    await request(app)
      .post('/api/acknowledgeAchievements')
      .set(AUTH_HEADER)
      .send(body)

    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.seenAchievements).toEqual(['first_save'])
  })

  it('preserves existing profile fields when acknowledging (upsert)', async () => {
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: TEST_UID, bio: 'hi', location: 'PDX' })

    await request(app)
      .post('/api/acknowledgeAchievements')
      .set(AUTH_HEADER)
      .send({ ids: ['critic'] })

    const doc = await getDB()
      .collection('userProfiles')
      .findOne({ _id: TEST_UID })
    expect(doc.bio).toBe('hi')
    expect(doc.location).toBe('PDX')
    expect(doc.seenAchievements).toEqual(['critic'])
  })
})
