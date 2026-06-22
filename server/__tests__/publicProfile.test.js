const request = require('supertest')
const admin = require('firebase-admin')
const app = require('../app')
const { getDB } = require('../db')
const {
  seedUser,
  seedRecipes,
  seedUserRecipeData,
  seedRating,
} = require('./helpers/seed')

const PUB_UID = 'pub-uid'

beforeEach(() => {
  admin.__getUser.mockReset()
  admin.__getUser.mockResolvedValue({
    displayName: 'Cool Cook',
    photoURL: 'https://example.com/cool.png',
  })
})

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

const seedProfile = async () => {
  await seedUser(PUB_UID, 'CoolUser')
  await getDB()
    .collection('userProfiles')
    .insertOne({ _id: PUB_UID, bio: 'I cook', location: 'PDX' })
  await seedRecipes([
    { _id: 'c1', userId: PUB_UID, createdAt: '2000' },
    { _id: 'c2', userId: PUB_UID, createdAt: '1000' },
  ])
  await seedUserRecipeData(PUB_UID, {
    savedRecipes: [{ recipeId: 'c1', dateSaved: '1' }],
  })
  await seedRating({ userId: PUB_UID, username: 'CoolUser', recipeId: 'c1', rating: 5 })
}

describe('GET /getPublicProfile', () => {
  it('returns 400 when username is missing', async () => {
    const res = await request(app).get('/api/getPublicProfile')
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown username', async () => {
    const res = await request(app).get('/api/getPublicProfile?username=nobody')
    expect(res.status).toBe(404)
  })

  it('requires no auth (publicly readable)', async () => {
    await seedProfile()
    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
  })

  it('returns identity, bio/location, level, achievements, and recipes', async () => {
    await seedProfile()
    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('CoolUser')
    expect(res.body.displayName).toBe('Cool Cook')
    expect(res.body.photoURL).toBe('https://example.com/cool.png')
    expect(res.body.bio).toBe('I cook')
    expect(res.body.location).toBe('PDX')
    // 2*100 + 1*15 + 1*5 = 220 XP → level 2.
    expect(res.body.level).toBe(2)
    expect(res.body.rank).toBe('New Cook')
    // Only earned achievements are exposed.
    const earnedIds = res.body.achievements.map(a => a.id)
    expect(earnedIds).toContain('first_recipe')
    expect(earnedIds).toContain('first_review')
    expect(earnedIds).toContain('first_save')
    expect(earnedIds).not.toContain('prolific')
    // Recipes newest-first, with the total.
    expect(res.body.recipes.map(r => r._id)).toEqual(['c1', 'c2'])
    expect(res.body.recipesTotalCount).toBe(2)
  })

  it('excludes held / hidden recipes from both the list and the total count', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await seedRecipes([
      { _id: 'v1', userId: PUB_UID, createdAt: '4000' },
      { _id: 'v2', userId: PUB_UID, createdAt: '3000' },
      { _id: 'held', userId: PUB_UID, createdAt: '2000', status: 'pending_review' },
      { _id: 'hid', userId: PUB_UID, createdAt: '1000', status: 'hidden' },
    ])

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    // The list shows only visible recipes…
    expect(res.body.recipes.map(r => r._id)).toEqual(['v1', 'v2'])
    // …and the reported total agrees with it (no leak of held/hidden existence).
    expect(res.body.recipesTotalCount).toBe(2)
  })

  it('caps recipes at 12 but reports the full total', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await seedRecipes(
      Array.from({ length: 13 }, (_, i) => ({
        _id: `r${i}`,
        userId: PUB_UID,
        createdAt: String(i),
      }))
    )

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(12)
    expect(res.body.recipesTotalCount).toBe(13)
  })

  // Contract guard: the frontend PublicProfile type mocks this exact shape.
  it('returns exactly the public-profile contract fields', async () => {
    await seedProfile()
    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'achievements',
        'bio',
        'displayName',
        'level',
        'location',
        'pct',
        'photoURL',
        'rank',
        'recipes',
        'recipesTotalCount',
        'recipesSavesTotal',
        'recipesMadeTotal',
        'username',
        'xp',
        'xpNext',
      ].sort()
    )
  })

  it('reports cross-recipe saves/made totals over all visible recipes', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await seedRecipes([
      { _id: 's1', userId: PUB_UID, createdAt: '3', numTimesSaved: 10, numTimesMade: 4 },
      { _id: 's2', userId: PUB_UID, createdAt: '2', numTimesSaved: 5, numTimesMade: 1 },
      // Held recipe must not contribute to the public totals.
      { _id: 'held', userId: PUB_UID, createdAt: '1', status: 'hidden', numTimesSaved: 99, numTimesMade: 99 },
    ])

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    expect(res.body.recipesTotalCount).toBe(2)
    expect(res.body.recipesSavesTotal).toBe(15)
    expect(res.body.recipesMadeTotal).toBe(5)
  })

  it('resolves the username case-insensitively', async () => {
    await seedProfile()
    const res = await request(app).get('/api/getPublicProfile?username=COOLUSER')
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('CoolUser')
  })

  it('does not leak private fields (email / seenAchievements)', async () => {
    await seedProfile()
    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.body.email).toBeUndefined()
    expect(res.body.seenAchievements).toBeUndefined()
  })

  it('falls back to the username when the Admin SDK lookup fails', async () => {
    await seedProfile()
    admin.__getUser.mockRejectedValueOnce(new Error('no such user'))

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('CoolUser')
    expect(res.body.photoURL).toBeNull()
  })

  // ── Privacy gating ──────────────────────────────────────────────────────────

  it('returns 404 when the profile is private', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: PUB_UID, bio: 'secret', location: 'PDX', isPublic: false })

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(404)
  })

  it('stays public when isPublic is explicitly true', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: PUB_UID, location: 'PDX', isPublic: true })

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    expect(res.body.location).toBe('PDX')
  })

  it('strips the location when hideLocation is set', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: PUB_UID, bio: 'hi', location: 'PDX', hideLocation: true })

    const res = await request(app).get('/api/getPublicProfile?username=CoolUser')
    expect(res.status).toBe(200)
    expect(res.body.location).toBe('')
    expect(res.body.bio).toBe('hi')
  })
})

describe('GET /getPublicProfileRecipes', () => {
  // Seed N visible recipes, newest-first by createdAt (r0 newest … r{N-1} oldest).
  // createdAt is stored/sorted as a string, so zero-pad to keep lexicographic
  // order equal to numeric order.
  const seedManyRecipes = async (n) => {
    await seedUser(PUB_UID, 'CoolUser')
    await seedRecipes(
      Array.from({ length: n }, (_, i) => ({
        _id: `r${i}`,
        userId: PUB_UID,
        createdAt: String(n - i).padStart(5, '0'), // r0 highest → comes first
      }))
    )
  }

  it('returns 400 when username is missing', async () => {
    const res = await request(app).get('/api/getPublicProfileRecipes')
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown username', async () => {
    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=nobody'
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when the profile is private', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await getDB()
      .collection('userProfiles')
      .insertOne({ _id: PUB_UID, isPublic: false })

    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser'
    )
    expect(res.status).toBe(404)
  })

  it('requires no auth (publicly readable)', async () => {
    await seedManyRecipes(2)
    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser'
    )
    expect(res.status).toBe(200)
  })

  it('pages newest-first and reports the full total', async () => {
    await seedManyRecipes(15)

    // Page 0 = the first 12 (mirrors the profile payload's initial batch).
    const p0 = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser&page=0&recipesPerPage=12'
    )
    expect(p0.status).toBe(200)
    expect(p0.body.recipes).toHaveLength(12)
    expect(p0.body.recipes.map(r => r._id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `r${i}`)
    )
    expect(p0.body.totalCount).toBe(15)

    // Page 1 picks up exactly where page 0 left off (r12, r13, r14).
    const p1 = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser&page=1&recipesPerPage=12'
    )
    expect(p1.status).toBe(200)
    expect(p1.body.recipes.map(r => r._id)).toEqual(['r12', 'r13', 'r14'])
    expect(p1.body.totalCount).toBe(15)
  })

  it('treats a negative page as page 0 (no negative skip / 500)', async () => {
    await seedManyRecipes(3)
    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser&page=-1'
    )
    expect(res.status).toBe(200)
    expect(res.body.recipes.map(r => r._id)).toEqual(['r0', 'r1', 'r2'])
  })

  it('caps the page size at 12 even if a larger one is requested', async () => {
    await seedManyRecipes(20)
    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser&page=0&recipesPerPage=100'
    )
    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(12)
  })

  it('excludes held / hidden recipes from both the page and the total', async () => {
    await seedUser(PUB_UID, 'CoolUser')
    await seedRecipes([
      { _id: 'v1', userId: PUB_UID, createdAt: '4000' },
      { _id: 'v2', userId: PUB_UID, createdAt: '3000' },
      { _id: 'held', userId: PUB_UID, createdAt: '2000', status: 'pending_review' },
      { _id: 'hid', userId: PUB_UID, createdAt: '1000', status: 'hidden' },
    ])

    const res = await request(app).get(
      '/api/getPublicProfileRecipes?username=CoolUser'
    )
    expect(res.status).toBe(200)
    expect(res.body.recipes.map(r => r._id)).toEqual(['v1', 'v2'])
    expect(res.body.totalCount).toBe(2)
  })
})
