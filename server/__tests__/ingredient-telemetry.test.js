/**
 * Ingredient-enrichment telemetry (N6 + N1 outlier guard).
 *
 * Covers the two halves that share the `ingredientMisses` collection:
 *   - POST /api/ingredients/parse writes a best-effort telemetry doc — `miss`
 *     on a clean enrichment miss, `price_outlier` when an enriched row's price
 *     clears the outlier ceiling ($15) — and increments a per-key counter.
 *   - GET /api/admin/ingredients lists them read-only, admin-gated, filterable
 *     by type, sorted by count desc.
 *
 * The parser is mocked (no real proxy calls); the DB is the shared in-memory
 * replica set from setup.js.
 */

jest.mock('@jclind/ingredient-parser', () => ({
  ingredientParser: jest.fn(),
}))

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { ingredientParser } = require('@jclind/ingredient-parser')
const { getDB } = require('../db')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// Build a v2 ingredientParser result with a given price (cents). `null` price
// omits it entirely (partial enrichment); `undefined` data models a clean miss.
const v2Result = (cents) => ({
  parsed: { original: 'x' },
  data: {
    name: 'strawberries',
    category: 'Produce',
    image: 'https://spoonacular.com/cdn/ingredients_100x100/strawberries.png',
    possibleUnits: ['cup', 'g'],
    nutrition: null,
    price: cents == null ? null : { cents, basis: 'gram' },
  },
})

const miss = () => ({ parsed: { original: 'x' }, data: null })

beforeEach(() => {
  ingredientParser.mockReset()
})

afterEach(async () => {
  admin.__resetClaims()
  await getDB().collection('ingredientMisses').deleteMany({})
})

describe('POST /api/ingredients/parse — telemetry writes', () => {
  it('records a `miss` doc on a clean enrichment miss', async () => {
    ingredientParser.mockResolvedValue(miss())
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '1 cup zzqxnonexistent, fresh' })
    // Response is unaffected — telemetry never changes the parse contract.
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ingredientData: null })

    const docs = await getDB().collection('ingredientMisses').find({}).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({
      _id: 'miss:1 cup zzqxnonexistent', // comma-clause dropped, lowercased
      type: 'miss',
      normalized: '1 cup zzqxnonexistent',
      raw: '1 cup zzqxnonexistent, fresh',
      count: 1,
    })
    expect(docs[0].firstSeen).toBeInstanceOf(Date)
    expect(docs[0].lastSeen).toBeInstanceOf(Date)
  })

  it('records a `price_outlier` doc when an enriched price clears the ceiling', async () => {
    ingredientParser.mockResolvedValue(v2Result(2533.86)) // → $25.34, the parfait class
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '1 cup strawberries' })
    // The price still flows through to the client unchanged — flag, not clamp.
    expect(res.status).toBe(200)
    expect(res.body.ingredientData.totalPriceUSACents).toBe(2534)

    const doc = await getDB()
      .collection('ingredientMisses')
      .findOne({ _id: 'price_outlier:1 cup strawberries' })
    expect(doc).toMatchObject({
      type: 'price_outlier',
      normalized: '1 cup strawberries',
      name: 'strawberries',
      priceCents: 2534,
      count: 1,
    })
  })

  it('records nothing for a normal, plausibly-priced ingredient', async () => {
    ingredientParser.mockResolvedValue(v2Result(160.88)) // $1.61 — fine
    const res = await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: '1 cup granola' })
    expect(res.status).toBe(200)
    const count = await getDB().collection('ingredientMisses').countDocuments({})
    expect(count).toBe(0)
  })

  it('records nothing when an enriched ingredient has no price at all', async () => {
    ingredientParser.mockResolvedValue(v2Result(null))
    await request(app)
      .post('/api/ingredients/parse')
      .set(AUTH_HEADER)
      .send({ ingredientString: 'pinch of salt' })
    const count = await getDB().collection('ingredientMisses').countDocuments({})
    expect(count).toBe(0)
  })

  it('never breaks the parse response when the telemetry write fails', async () => {
    ingredientParser.mockResolvedValue(miss())
    const db = getDB()
    // db.collection() mints a new Collection instance per call, so intercept the
    // factory and reject updateOne only on the telemetry collection — the route's
    // own handle then hits the recordIngredientTelemetry catch (ingredients.js).
    const realCollection = db.collection.bind(db)
    const collectionSpy = jest.spyOn(db, 'collection').mockImplementation((name) => {
      const coll = realCollection(name)
      if (name === 'ingredientMisses') {
        jest.spyOn(coll, 'updateOne').mockRejectedValue(new Error('telemetry db down'))
      }
      return coll
    })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const res = await request(app)
        .post('/api/ingredients/parse')
        .set(AUTH_HEADER)
        .send({ ingredientString: '1 cup zzqxnonexistent' })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ingredientData: null })
    } finally {
      collectionSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('increments the counter (not a new doc) on a repeat of the same string', async () => {
    ingredientParser.mockResolvedValue(miss())
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/ingredients/parse')
        .set(AUTH_HEADER)
        .send({ ingredientString: 'made up thing' })
    }
    const docs = await getDB().collection('ingredientMisses').find({}).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].count).toBe(3)
  })
})

describe('GET /api/admin/ingredients', () => {
  const seedTelemetry = () =>
    getDB()
      .collection('ingredientMisses')
      .insertMany([
        { _id: 'miss:a', type: 'miss', normalized: 'a', raw: 'a', count: 5, firstSeen: new Date(), lastSeen: new Date() },
        { _id: 'miss:b', type: 'miss', normalized: 'b', raw: 'b', count: 1, firstSeen: new Date(), lastSeen: new Date() },
        { _id: 'price_outlier:c', type: 'price_outlier', normalized: 'c', raw: 'c', name: 'c', priceCents: 2000, count: 9, firstSeen: new Date(), lastSeen: new Date() },
      ])

  it('requires admin (403 without the claim)', async () => {
    const res = await request(app).get('/api/admin/ingredients').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('lists all telemetry sorted by count desc', async () => {
    admin.__setClaims({ admin: true })
    await seedTelemetry()
    const res = await request(app).get('/api/admin/ingredients').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(3)
    expect(res.body.items.map((i) => i.count)).toEqual([9, 5, 1]) // count desc
  })

  it('filters by type', async () => {
    admin.__setClaims({ admin: true })
    await seedTelemetry()
    const res = await request(app)
      .get('/api/admin/ingredients?type=price_outlier')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
    expect(res.body.items[0]).toMatchObject({ type: 'price_outlier', priceCents: 2000 })
  })

  it('ignores an unknown type filter (lists everything)', async () => {
    admin.__setClaims({ admin: true })
    await seedTelemetry()
    const res = await request(app)
      .get('/api/admin/ingredients?type=bogus')
      .set(AUTH_HEADER)
    expect(res.body.totalCount).toBe(3)
  })

  it('floors a negative perPage instead of 500ing (negative skip)', async () => {
    admin.__setClaims({ admin: true })
    await seedTelemetry()
    // A negative perPage floors to 1, so page=2 (skip=1) returns the
    // 2nd-highest-count item (count desc: 9, 5, 1 → the count:5 doc).
    const res = await request(app)
      .get('/api/admin/ingredients?page=2&perPage=-5')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].count).toBe(5)
    expect(res.body.totalCount).toBe(3)
  })
})
