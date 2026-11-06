/**
 * Review fix 1b (AC-2, CR-34) — the server only accepts an image URL the caller
 * could have uploaded: a Firebase Storage download URL, in this project's bucket,
 * under the caller's own path. Before this, `recipeImage` and `photoURL` were
 * taken as-is, so a recipe or avatar could point at someone else's file, an
 * outside host, or (as an array) skip the Vision scan entirely.
 *
 * moderateImage is mocked, so "no Vision call" means it was never invoked.
 * setup.js sets FIREBASE_STORAGE_BUCKET=test-bucket for the suite.
 */

jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))
jest.mock('../util/imageModeration', () => ({ moderateImage: jest.fn() }))

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { moderateText } = require('../util/textModeration')
const { moderateImage } = require('../util/imageModeration')
const { seedRecipe } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH = { Authorization: 'Bearer fake-test-token' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }
const IMG_CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'vision' }

const fbUrl = (bucket, path) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=t`
const OWN_IMAGE = fbUrl('test-bucket', `recipeImages/${TEST_UID}/abc-123`)
const OWN_PHOTO = fbUrl('test-bucket', `profilePhotos/${TEST_UID}`)

// Each of these must be refused for a recipe image, with no scan.
const BAD_RECIPE_IMAGES = {
  'an array': [OWN_IMAGE],
  'an object': { url: OWN_IMAGE },
  'another host': 'https://evil.example.com/v0/b/test-bucket/o/recipeImages%2Ftest-uid%2Fx?alt=media',
  'plain http': OWN_IMAGE.replace('https://', 'http://'),
  'another bucket': fbUrl('someone-elses-bucket', `recipeImages/${TEST_UID}/abc-123`),
  "another user's path": fbUrl('test-bucket', 'recipeImages/other-uid/abc-123'),
  'a legacy flat path': fbUrl('test-bucket', 'recipeImages/abc-123.jpg'),
  "the caller's avatar": OWN_PHOTO,
  'a traversal': fbUrl('test-bucket', `recipeImages/${TEST_UID}/../other-uid/x`),
}

const RECIPE_BODY = {
  title: 'Tuscan Chicken Skillet',
  description: 'A great dish',
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: ['low-carb'],
  ingredients: [
    {
      id: 'i1',
      parsedIngredient: { ingredient: 'chicken', originalIngredientString: '1 lb chicken', comment: null },
      ingredientData: { name: 'chicken' },
    },
  ],
  instructions: [{ content: 'Cook the chicken', index: 0, id: 's1' }],
  recipeImage: OWN_IMAGE,
}

beforeEach(async () => {
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
  moderateImage.mockReset()
  moderateImage.mockResolvedValue(IMG_CLEAN)
  admin.__updateUser.mockClear()
  await getDB().collection('usernames').updateOne(
    { _id: TEST_UID },
    { $set: { username: 'chef_test', username_lower: 'chef_test' } },
    { upsert: true }
  )
})

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
  ])
})

describe('POST /addRecipe — recipeImage must be the caller\'s own upload', () => {
  it('accepts an image under the caller\'s recipeImages/{uid}/ path', async () => {
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(moderateImage).toHaveBeenCalledWith(OWN_IMAGE, 'recipe.image')
  })

  it('accepts a recipe with no image', async () => {
    const res = await request(app).post('/api/addRecipe').set(AUTH).send({ ...RECIPE_BODY, recipeImage: '' })
    expect(res.status).toBe(201)
  })

  for (const [label, recipeImage] of Object.entries(BAD_RECIPE_IMAGES)) {
    it(`rejects ${label} with 400 and no Vision call`, async () => {
      const res = await request(app).post('/api/addRecipe').set(AUTH).send({ ...RECIPE_BODY, recipeImage })
      expect(res.status).toBe(400)
      expect(moderateImage).not.toHaveBeenCalled()
      expect(await getDB().collection('recipes').countDocuments({})).toBe(0)
    })
  }
})

describe('PUT /editRecipe — a changed recipeImage gets the same check', () => {
  const LEGACY = fbUrl('prepify-9b974.appspot.com', 'recipeImages/Pad-Thai.jpg')

  it('an unchanged legacy URL still saves', async () => {
    await seedRecipe({ ...RECIPE_BODY, recipeImage: LEGACY, _id: 'own-1', userId: TEST_UID })
    const res = await request(app)
      .put('/api/editRecipe?recipeId=own-1')
      .set(AUTH)
      .send({ ...RECIPE_BODY, title: 'Renamed', recipeImage: LEGACY })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Renamed')
  })

  for (const [label, recipeImage] of Object.entries(BAD_RECIPE_IMAGES)) {
    it(`rejects a change to ${label} with 400, recipe untouched`, async () => {
      await seedRecipe({ ...RECIPE_BODY, _id: 'own-2', userId: TEST_UID })
      const res = await request(app)
        .put('/api/editRecipe?recipeId=own-2')
        .set(AUTH)
        .send({ ...RECIPE_BODY, title: 'Renamed', recipeImage })
      expect(res.status).toBe(400)
      expect(moderateImage).not.toHaveBeenCalled()
      const saved = await getDB().collection('recipes').findOne({ _id: 'own-2' })
      expect(saved.recipeImage).toBe(OWN_IMAGE)
      expect(saved.title).toBe(RECIPE_BODY.title)
    })
  }
})

describe('POST /updatePhoto — photoURL must be the caller\'s own avatar', () => {
  const post = (photoURL) => request(app).post('/api/updatePhoto').set(AUTH).send({ photoURL })

  it('accepts profilePhotos/{uid}', async () => {
    const res = await post(OWN_PHOTO)
    expect(res.status).toBe(200)
    expect(admin.__updateUser).toHaveBeenCalledWith(TEST_UID, { photoURL: OWN_PHOTO })
  })

  const BAD_PHOTOS = {
    'another host': 'https://evil.example.com/a.png',
    'another bucket': fbUrl('someone-elses-bucket', `profilePhotos/${TEST_UID}`),
    "another user's avatar": fbUrl('test-bucket', 'profilePhotos/other-uid'),
    'a recipe image': OWN_IMAGE,
  }
  for (const [label, photoURL] of Object.entries(BAD_PHOTOS)) {
    it(`rejects ${label} with 400 and no Vision call`, async () => {
      const res = await post(photoURL)
      expect(res.status).toBe(400)
      expect(moderateImage).not.toHaveBeenCalled()
      expect(admin.__updateUser).not.toHaveBeenCalled()
    })
  }
})
