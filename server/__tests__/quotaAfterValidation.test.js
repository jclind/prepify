/**
 * Review fix 1e (AC-5, first half) — the daily paid quota is reserved after the
 * request is validated, not before.
 *
 * The quota used to be middleware ahead of the handler, so a malformed body
 * still bumped the per-account counter and the shared global one. Throwaway
 * accounts could fill everyone's daily pool without a single paid call. A valid
 * request still reserves before the upstream call, so a failed upstream call is
 * still counted (the conservative half CR asked to keep).
 *
 * PAID_QUOTA_ENFORCE_IN_TEST turns the quota on for this file.
 */

jest.mock('@jclind/ingredient-parser', () => ({ ingredientParser: jest.fn() }))
jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))
jest.mock('../util/imageModeration', () => ({ moderateImage: jest.fn() }))

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { ingredientParser } = require('@jclind/ingredient-parser')
const { moderateText } = require('../util/textModeration')
const { moderateImage } = require('../util/imageModeration')

const TEST_UID = 'test-uid'
const AUTH = { Authorization: 'Bearer fake-test-token' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }

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
}

const realFetch = global.fetch

// Counter docs for one surface: the caller's and the global one.
const counts = async (surface) => {
  const docs = await getDB().collection('paidQuota').find({ _id: { $regex: `:${surface}:` } }).toArray()
  return docs.map((d) => d.count)
}

beforeEach(() => {
  process.env.PAID_QUOTA_ENFORCE_IN_TEST = '1'
  process.env.EDAMAM_APP_ID = 'id'
  process.env.EDAMAM_APP_KEY = 'key'
  ingredientParser.mockReset()
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
  moderateImage.mockReset()
  moderateImage.mockResolvedValue({ ...CLEAN, source: 'vision' })
})

afterEach(async () => {
  delete process.env.PAID_QUOTA_ENFORCE_IN_TEST
  delete process.env.EDAMAM_APP_ID
  delete process.env.EDAMAM_APP_KEY
  global.fetch = realFetch
  const db = getDB()
  await Promise.all(
    ['paidQuota', 'recipes', 'usernames', 'userRecipeData'].map((c) => db.collection(c).deleteMany({}))
  )
})

describe('POST /ingredients/parse', () => {
  const parse = (body) => request(app).post('/api/ingredients/parse').set(AUTH).send(body)

  it('a malformed body is not counted', async () => {
    expect((await parse({})).status).toBe(400)
    expect((await parse({ ingredientString: ['x'] })).status).toBe(400)
    expect(await counts('ingredients')).toEqual([])
  })

  it('a valid call is counted before the upstream call, even when it fails', async () => {
    ingredientParser.mockRejectedValue(new Error('proxy down'))
    await parse({ ingredientString: '1 cup flour' })
    expect(ingredientParser).toHaveBeenCalledTimes(1)
    expect(await counts('ingredients')).toEqual([1, 1])
  })
})

describe('POST /nutrition/details', () => {
  const details = (body) => request(app).post('/api/nutrition/details').set(AUTH).send(body)

  it('a malformed or oversized body is not counted', async () => {
    global.fetch = jest.fn()
    expect((await details({ ingr: 'flour' })).status).toBe(400)
    expect((await details({ ingr: [] })).status).toBe(400)
    expect((await details({ ingr: Array(500).fill('flour') })).status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(await counts('nutrition')).toEqual([])
  })

  it('is not counted when the Edamam keys are missing', async () => {
    delete process.env.EDAMAM_APP_ID
    expect((await details({ ingr: ['1 cup flour'] })).status).toBe(503)
    expect(await counts('nutrition')).toEqual([])
  })

  it('a valid call is counted', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ calories: 1 }) })
    expect((await details({ ingr: ['1 cup flour'] })).status).toBe(200)
    expect(await counts('nutrition')).toEqual([1, 1])
  })
})

describe('POST /addRecipe', () => {
  const add = (body) => request(app).post('/api/addRecipe').set(AUTH).send(body)
  const setUsername = () =>
    getDB().collection('usernames').insertOne({ _id: TEST_UID, username: 'chef', username_lower: 'chef' })

  it('a body that fails validation is not counted', async () => {
    await setUsername()
    expect((await add({ ...RECIPE_BODY, title: '' })).status).toBe(400)
    expect((await add({ ...RECIPE_BODY, servings: -5 })).status).toBe(400)
    expect(await counts('recipe')).toEqual([])
  })

  it('a caller with no username is not counted', async () => {
    expect((await add(RECIPE_BODY)).status).toBe(400)
    expect(await counts('recipe')).toEqual([])
  })

  it('a valid create is counted', async () => {
    await setUsername()
    expect((await add(RECIPE_BODY)).status).toBe(201)
    expect(await counts('recipe')).toEqual([1, 1])
  })
})
