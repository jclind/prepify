/**
 * Review fix 1a (CR-6, AC-4) — daily Cloud Vision budget on the two routes that
 * scan an image outside recipe create: POST /updatePhoto and PUT /editRecipe when
 * the image changed. Both used to sit behind only a per-minute limiter, so a
 * throwaway account could buy unbounded scans per day.
 *
 * The quota limiter normally skips under NODE_ENV=test; PAID_QUOTA_ENFORCE_IN_TEST
 * turns it back on for this file only, with small caps set through the same env
 * vars a deploy would use. moderateImage is mocked, so no real scan runs; the
 * assertion that matters is how often it was called.
 */

jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))
jest.mock('../util/imageModeration', () => ({ moderateImage: jest.fn() }))

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { moderateText } = require('../util/textModeration')
const { moderateImage } = require('../util/imageModeration')
const { seedRecipe } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH = { Authorization: 'Bearer fake-test-token' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }
const IMG_CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'vision' }

const img = (name) =>
  `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2F${name}.jpg?alt=media&token=t`
const photo = (n) =>
  `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/profilePhotos%2Ftest-uid-${n}?alt=media&token=p`

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
  recipeImage: img('orig'),
}

const ENV_KEYS = ['PAID_QUOTA_ENFORCE_IN_TEST', 'PAID_QUOTA_VISION_USER_DAILY', 'PAID_QUOTA_VISION_GLOBAL_DAILY']
const setCaps = (user, global) => {
  process.env.PAID_QUOTA_VISION_USER_DAILY = String(user)
  process.env.PAID_QUOTA_VISION_GLOBAL_DAILY = String(global)
}

const updatePhoto = (photoURL) => request(app).post('/api/updatePhoto').set(AUTH).send({ photoURL })
const editRecipe = (body) => request(app).put('/api/editRecipe?recipeId=vq-1').set(AUTH).send(body)

beforeEach(async () => {
  process.env.PAID_QUOTA_ENFORCE_IN_TEST = '1'
  setCaps(2, 100)
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
  moderateImage.mockReset()
  moderateImage.mockResolvedValue(IMG_CLEAN)
  await seedRecipe({ ...RECIPE_BODY, _id: 'vq-1', userId: TEST_UID })
})

afterEach(async () => {
  for (const k of ENV_KEYS) delete process.env[k]
  const db = getDB()
  await Promise.all([
    db.collection('paidQuota').deleteMany({}),
    db.collection('recipes').deleteMany({}),
  ])
})

describe('POST /updatePhoto — daily Vision quota', () => {
  it('returns 429 DAILY_QUOTA_EXCEEDED on the scan past the per-account cap, without scanning', async () => {
    expect((await updatePhoto(photo(1))).status).toBe(200)
    expect((await updatePhoto(photo(2))).status).toBe(200)
    const res = await updatePhoto(photo(3))
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('DAILY_QUOTA_EXCEEDED')
    expect(moderateImage).toHaveBeenCalledTimes(2)
  })

  it('enforces the global ceiling too', async () => {
    setCaps(100, 2)
    await updatePhoto(photo(1))
    await updatePhoto(photo(2))
    const res = await updatePhoto(photo(3))
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('DAILY_QUOTA_EXCEEDED')
  })

  it('clearing the photo needs no scan and is never charged', async () => {
    for (let i = 0; i < 4; i++) {
      expect((await updatePhoto('')).status).toBe(200)
    }
    expect((await updatePhoto(photo(1))).status).toBe(200)
    expect(await getDB().collection('paidQuota').countDocuments({})).toBe(2) // one user + one global counter
  })

  it('a non-string photoURL is rejected before it is charged', async () => {
    expect((await updatePhoto(['x'])).status).toBe(400)
    expect(await getDB().collection('paidQuota').countDocuments({})).toBe(0)
  })
})

describe('PUT /editRecipe — daily Vision quota on image changes', () => {
  it('returns 429 on the image change past the cap and leaves the recipe unchanged', async () => {
    expect((await editRecipe({ ...RECIPE_BODY, recipeImage: img('a') })).status).toBe(200)
    expect((await editRecipe({ ...RECIPE_BODY, recipeImage: img('b') })).status).toBe(200)
    const res = await editRecipe({ ...RECIPE_BODY, title: 'Renamed', recipeImage: img('c') })
    expect(res.status).toBe(429)
    expect(res.body.code).toBe('DAILY_QUOTA_EXCEEDED')
    const saved = await getDB().collection('recipes').findOne({ _id: 'vq-1' })
    expect(saved.recipeImage).toBe(img('b'))
    expect(saved.title).toBe(RECIPE_BODY.title)
  })

  it('text-only edits are not charged, even past the cap', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await editRecipe({ ...RECIPE_BODY, title: `Edit ${i}` })
      expect(res.status).toBe(200)
    }
    expect(await getDB().collection('paidQuota').countDocuments({})).toBe(0)
  })

  it('an edit that fails validation is not charged', async () => {
    const res = await editRecipe({ ...RECIPE_BODY, title: '', recipeImage: img('a') })
    expect(res.status).toBe(400)
    expect(await getDB().collection('paidQuota').countDocuments({})).toBe(0)
  })

  it('updatePhoto and editRecipe share one Vision budget', async () => {
    await updatePhoto(photo(1))
    await editRecipe({ ...RECIPE_BODY, recipeImage: img('a') })
    expect((await updatePhoto(photo(2))).status).toBe(429)
    expect((await editRecipe({ ...RECIPE_BODY, recipeImage: img('b') })).status).toBe(429)
  })
})
