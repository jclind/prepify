const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const {
  seedRecipes,
  seedUserRecipeData,
  seedUser,
  seedRating,
} = require('./helpers/seed')
const { getAccountCountsFor } = require('../util/accountCounts')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('userRecipeData').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('recipeDrafts').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('usernames').deleteMany({}),
  ])
})

// ─── GET /getSavedRecipes ─────────────────────────────────────────────────────

describe('GET /getSavedRecipes', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getSavedRecipes')
    expect(res.status).toBe(401)
  })

  it('returns empty recipes and totalCount 0 when user has no saved recipes', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ recipes: [], totalCount: 0 })
  })

  it('returns saved recipes with totalCount', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Recipe One' },
      { _id: 'r2', title: 'Recipe Two' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes).toHaveLength(2)
  })

  it('excludes soft-hidden recipes from totalCount on the save-time path', async () => {
    // Regression: totalCount used to count raw saved entries, so a hidden saved
    // recipe (dropped from the page) left totalCount > visible count and the
    // client's Load More button stuck on forever fetching nothing.
    await seedRecipes([
      { _id: 'r1', title: 'Visible One' },
      { _id: 'r2', title: 'Hidden', status: 'hidden' },
      { _id: 'r3', title: 'Visible Two' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
        { recipeId: 'r3', dateSaved: '3000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes.map((r) => r._id).sort()).toEqual(['r1', 'r3'])
  })

  it('paginates results', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Recipe One' },
      { _id: 'r2', title: 'Recipe Two' },
      { _id: 'r3', title: 'Recipe Three' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
        { recipeId: 'r3', dateSaved: '3000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?page=0&recipesPerPage=2')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(2)
    expect(res.body.totalCount).toBe(3)
  })

  it('order=new returns the newest-saved recipe first (page=0, recipesPerPage=1)', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old Recipe' },
      { _id: 'r2', title: 'New Recipe' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '9000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?order=new&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r2')
  })

  it('order=old returns the oldest-saved recipe first (page=0, recipesPerPage=1)', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old Recipe' },
      { _id: 'r2', title: 'New Recipe' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '9000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?order=old&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r1')
  })

  it('q filters saved recipes by title (case-insensitive) and counts only matches', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Tomato Soup' },
      { _id: 'r2', title: 'Chicken Tacos' },
      { _id: 'r3', title: 'Potato Soup' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
        { recipeId: 'r3', dateSaved: '3000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?q=SOUP')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    const ids = res.body.recipes.map((r) => r._id).sort()
    expect(ids).toEqual(['r1', 'r3'])
  })

  it('q keeps save-time order (newest first) over the matches', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old Soup' },
      { _id: 'r2', title: 'New Soup' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '9000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?q=soup')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes.map((r) => r._id)).toEqual(['r2', 'r1'])
  })

  it('q combines with a collection filter', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Tomato Soup' },
      { _id: 'r2', title: 'Potato Soup' },
    ])
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'col1', name: 'Dinners', createdAt: '1' }],
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000', collectionIds: ['col1'] },
        { recipeId: 'r2', dateSaved: '2000', collectionIds: [] },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?q=soup&collectionId=col1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
    expect(res.body.recipes.map((r) => r._id)).toEqual(['r1'])
  })
})

// ─── GET /getCreatedRecipes ───────────────────────────────────────────────────

describe('GET /getCreatedRecipes', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getCreatedRecipes')
    expect(res.status).toBe(401)
  })

  it('returns empty recipes and totalCount 0 when user has created none', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Someone Else', userId: 'other-uid', createdAt: '1000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ recipes: [], totalCount: 0 })
  })

  it('returns only recipes authored by the current user', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Mine One', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'Theirs', userId: 'other-uid', createdAt: '2000' },
      { _id: 'r3', title: 'Mine Two', userId: TEST_UID, createdAt: '3000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes.map((r) => r._id).sort()).toEqual(['r1', 'r3'])
  })

  it('paginates results', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'One', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'Two', userId: TEST_UID, createdAt: '2000' },
      { _id: 'r3', title: 'Three', userId: TEST_UID, createdAt: '3000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?page=0&recipesPerPage=2')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(2)
    expect(res.body.totalCount).toBe(3)
  })

  it('order=new returns the newest-created recipe first', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'New', userId: TEST_UID, createdAt: '9000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?order=new&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r2')
  })

  it('order=old returns the oldest-created recipe first', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'New', userId: TEST_UID, createdAt: '9000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?order=old&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r1')
  })

  it('projects to the card shape — never leaks internal moderation stamps to the author', async () => {
    // Regression: the endpoint used to return full recipe docs, so the admin-uid
    // moderation/curation stamps ($set by the moderation routes) reached the
    // non-admin author. The card projection is a whitelist, so they can't.
    await seedRecipes([
      {
        _id: 'r1',
        title: 'Mine',
        userId: TEST_UID,
        createdAt: '1000',
        recipeImage: 'img.jpg',
        servingPrice: 3,
        totalTime: 20,
        views: 5,
        numTimesSaved: 2,
        numTimesMade: 1,
        rating: { rateValue: 4, rateCount: 3 },
        // Heavy body the card never renders + the internal stamps that must not leak.
        ingredients: [{ name: 'flour' }],
        instructions: ['mix'],
        nutritionData: { calories: 100 },
        moderatedBy: 'admin-uid',
        moderatedAt: '2000',
        featuredBy: 'admin-uid',
        featuredAt: '3000',
        publishUpdatedBy: 'admin-uid',
        publishUpdatedAt: '4000',
      },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    const recipe = res.body.recipes[0]
    // The six admin-uid stamps and the heavy body are gone.
    for (const key of [
      'moderatedBy',
      'moderatedAt',
      'featuredBy',
      'featuredAt',
      'publishUpdatedBy',
      'publishUpdatedAt',
      'ingredients',
      'instructions',
      'nutritionData',
    ]) {
      expect(recipe).not.toHaveProperty(key)
    }
    // The fields the thumbnail renders survive.
    expect(recipe).toMatchObject({
      _id: 'r1',
      title: 'Mine',
      recipeImage: 'img.jpg',
      servingPrice: 3,
      createdAt: '1000',
      totalTime: 20,
      views: 5,
      numTimesSaved: 2,
      numTimesMade: 1,
      rating: { rateValue: 4, rateCount: 3 },
    })
  })
})

// ─── getAccountCountsFor (shared helper) ──────────────────────────────────────

describe('getAccountCountsFor', () => {
  it("counts a user's ratings by their stable userId (D1)", async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([{ _id: 'c1', userId: TEST_UID }])
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c1', rating: 5 })

    const counts = await getAccountCountsFor(getDB(), TEST_UID)
    expect(counts.ratings).toBe(1)
    expect(counts.recipes).toBe(1)
  })
})

// ─── GET /getAccountCounts ────────────────────────────────────────────────────

describe('GET /getAccountCounts', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getAccountCounts')
    expect(res.status).toBe(401)
  })

  it('returns all-zero counts for a user with no data', async () => {
    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: 0, ratings: 0, recipes: 0, drafts: 0 })
  })

  it('counts saved recipes, created recipes, drafts, and ratings', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1' },
        { recipeId: 'r2', dateSaved: '2' },
        { recipeId: 'r3', dateSaved: '3' },
      ],
    })
    await seedRecipes([
      { _id: 'c1', userId: TEST_UID },
      { _id: 'c2', userId: TEST_UID },
      // The saved badge counts saved recipes that are actually visible (matching
      // the Saved tab list), so the saved ids must resolve to visible recipes.
      { _id: 'r1', userId: 'other' },
      { _id: 'r2', userId: 'other' },
      { _id: 'r3', userId: 'other' },
    ])
    await getDB()
      .collection('recipeDrafts')
      .insertMany([
        { _id: 'd1', userId: TEST_UID },
        { _id: 'd2', userId: TEST_UID },
        { _id: 'd3', userId: TEST_UID },
        { _id: 'd4', userId: TEST_UID },
      ])
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c1', rating: 5 })
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c2', rating: 4 })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: 3, ratings: 2, recipes: 2, drafts: 4 })
  })

  it("does not count another user's recipes, drafts, or ratings", async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedUser('other-uid', 'otheruser')
    await seedRecipes([
      { _id: 'mine', userId: TEST_UID },
      { _id: 'theirs', userId: 'other-uid' },
    ])
    await getDB()
      .collection('recipeDrafts')
      .insertOne({ _id: 'theirdraft', userId: 'other-uid' })
    await seedRating({ userId: 'other-uid', username: 'otheruser', recipeId: 'mine', rating: 5 })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: 0, ratings: 0, recipes: 1, drafts: 0 })
  })

  it('returns 0 ratings when no ratings are keyed to the user (D1)', async () => {
    // Ratings are keyed by the stable userId; rows authored by someone else
    // never count toward this user, regardless of recipe.
    await seedRecipes([{ _id: 'c1', userId: TEST_UID }])
    await seedRating({ userId: 'someoneelse-uid', username: 'someoneelse', recipeId: 'c1', rating: 5 })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: 0, ratings: 0, recipes: 1, drafts: 0 })
  })

  it('excludes soft-hidden saved recipes from the saved badge (matches the Saved tab)', async () => {
    // A moderation-hidden saved recipe drops from the Saved tab list, so the
    // badge must not count it either — otherwise the tile reads higher than the
    // grid it labels and can never be reconciled from the UI.
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 'vis', userId: 'other' },
      { _id: 'hid', userId: 'other', status: 'hidden' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'vis', dateSaved: '1' },
        { recipeId: 'hid', dateSaved: '2' },
      ],
    })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.saved).toBe(1)
  })

  it('excludes hidden/unpublished (but keeps pending_review) recipes from the recipes badge (matches getCreatedRecipes)', async () => {
    // getCreatedRecipes (the Your-Recipes tab list) filters RECIPE_OWNER_VISIBLE:
    // takedowns/de-publishes drop, but the owner still sees their own
    // pending_review recipes — the badge must match exactly.
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 'published', userId: TEST_UID },
      { _id: 'pending', userId: TEST_UID, status: 'pending_review' },
      { _id: 'hidden', userId: TEST_UID, status: 'hidden' },
      { _id: 'unpublished', userId: TEST_UID, status: 'unpublished' },
    ])

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.recipes).toBe(2)
  })

  it('excludes ratings on hidden/unpublished/pending_review recipes from the ratings badge (matches the Ratings tab)', async () => {
    // getSingleUserReviews's returnRecipeData join drops any rating whose
    // recipe isn't RECIPE_VISIBLE — the badge must match.
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([
      { _id: 'vis', userId: 'other' },
      { _id: 'pending', userId: 'other', status: 'pending_review' },
      { _id: 'hid', userId: 'other', status: 'hidden' },
    ])
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'vis', rating: 5 })
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'pending', rating: 4 })
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'hid', rating: 3 })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.ratings).toBe(1)
  })

  it('excludes moderation-hidden ratings from the ratings badge', async () => {
    await seedUser(TEST_UID, 'testuser')
    await seedRecipes([{ _id: 'c1', userId: 'other' }])
    await seedRating({ userId: TEST_UID, username: 'testuser', recipeId: 'c1', rating: 5 })
    await seedRating({
      userId: TEST_UID,
      username: 'testuser',
      recipeId: 'c1',
      rating: 1,
      moderationHidden: true,
    })

    const res = await request(app).get('/api/getAccountCounts').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.ratings).toBe(1)
  })
})
