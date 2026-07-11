/**
 * V5 — scripts/normalizeRatingTypes.js (legacy `ratings` field-type normalization).
 *
 * Runs the exported migration against the suite's in-memory Mongo. Pins the
 * invariants the prod run depends on:
 *   - legacy string `rating` / `reviewCreatedAt` are rewritten to numbers, and
 *     the rewritten values compare/sort by VALUE (single-typed collection)
 *   - review-only docs (rating: null) and empty-string reviewCreatedAt are LEFT
 *     alone — never coerced to 0
 *   - already-numeric docs are never rewritten
 *   - non-numeric garbage is reported and NOT written (no NaN ever lands)
 *   - dry run writes nothing; --apply is idempotent (a second run finds 0)
 */
const { getDB } = require('../db')
const {
  classifyRatingDoc,
  normalizeRatingTypes,
} = require('../scripts/normalizeRatingTypes')

const RECIPE = 'recipe-abc'

afterEach(async () => {
  await getDB().collection('ratings').deleteMany({})
})

// Convenience: fetch a doc's rating + reviewCreatedAt with their JS types intact.
async function read(id) {
  return getDB().collection('ratings').findOne({ _id: id })
}

describe('classifyRatingDoc (pure)', () => {
  test('converts stringified rating and reviewCreatedAt to numbers', () => {
    const { set, garbage } = classifyRatingDoc({
      rating: '5',
      reviewCreatedAt: '1677605819601',
    })
    expect(set).toEqual({ rating: 5, reviewCreatedAt: 1677605819601 })
    expect(garbage).toEqual([])
  })

  test('leaves review-only (null) rating and empty-string createdAt untouched', () => {
    const { set, garbage } = classifyRatingDoc({ rating: null, reviewCreatedAt: '' })
    expect(set).toEqual({})
    expect(garbage).toEqual([])
  })

  test('no-ops when both fields are already numeric', () => {
    const { set, garbage } = classifyRatingDoc({ rating: 4.5, reviewCreatedAt: 1677605819601 })
    expect(set).toEqual({})
    expect(garbage).toEqual([])
  })

  test('reports non-numeric garbage and never emits NaN', () => {
    const { set, garbage } = classifyRatingDoc({
      rating: 'not-a-number',
      reviewCreatedAt: 'bogus',
    })
    expect(set).toEqual({})
    expect(garbage).toEqual([
      { field: 'rating', value: 'not-a-number' },
      { field: 'reviewCreatedAt', value: 'bogus' },
    ])
  })

  test('an absent reviewCreatedAt is not created; a fractional rating string parses', () => {
    const { set, garbage } = classifyRatingDoc({ rating: '4.5' })
    expect(set).toEqual({ rating: 4.5 })
    expect(garbage).toEqual([])
  })

  test('a mixed doc can convert one field while flagging the other as garbage', () => {
    const { set, garbage } = classifyRatingDoc({ rating: '5', reviewCreatedAt: 'oops' })
    expect(set).toEqual({ rating: 5 })
    expect(garbage).toEqual([{ field: 'reviewCreatedAt', value: 'oops' }])
  })
})

describe('normalizeRatingTypes', () => {
  // A representative mixed-type fixture: two legacy string docs, one modern
  // numeric doc, one review-only null doc, one rating-first doc (createdAt ""),
  // and one garbage doc.
  const fixture = () => [
    { _id: 'legacy-1', recipeId: RECIPE, userId: 'u1', rating: '5', reviewCreatedAt: '1677605819601' },
    { _id: 'legacy-2', recipeId: RECIPE, userId: 'u2', rating: '3', reviewCreatedAt: '1677605820000' },
    { _id: 'modern-1', recipeId: RECIPE, userId: 'u3', rating: 4.5, reviewCreatedAt: 1699999999999 },
    { _id: 'review-only', recipeId: RECIPE, userId: 'u4', rating: null, reviewCreatedAt: '1680000000000' },
    { _id: 'rating-first', recipeId: RECIPE, userId: 'u5', rating: 2, reviewCreatedAt: '' },
    { _id: 'garbage-1', recipeId: RECIPE, userId: 'u6', rating: 'abc', reviewCreatedAt: 'xyz' },
  ]

  test('dry run (default) writes nothing', async () => {
    const db = getDB()
    await db.collection('ratings').insertMany(fixture())

    const { counts } = await normalizeRatingTypes(db)

    // reports the work but performs none. legacy-1/-2 (rating + createdAt) plus
    // review-only (its createdAt is a numeric string, though its rating stays null).
    expect(counts.migrated).toBe(3)
    expect(counts.ratingFixed).toBe(2)
    expect(counts.createdAtFixed).toBe(3)
    // every doc is byte-identical to what was seeded
    expect((await read('legacy-1')).rating).toBe('5')
    expect((await read('legacy-1')).reviewCreatedAt).toBe('1677605819601')
    expect((await read('legacy-2')).rating).toBe('3')
  })

  test('apply converts the mixed-type fixture and leaves nulls / empties / garbage', async () => {
    const db = getDB()
    await db.collection('ratings').insertMany(fixture())

    const { counts } = await normalizeRatingTypes(db, { apply: true })

    expect(counts).toMatchObject({
      scanned: 6,
      migrated: 3, // legacy-1, legacy-2, review-only (createdAt only)
      ratingFixed: 2, // legacy-1, legacy-2 (review-only's rating stays null)
      createdAtFixed: 3, // legacy-1, legacy-2, review-only
      nullRating: 1,
      garbageDocs: 1, // garbage-1 has no writable field
    })

    // legacy strings became numbers, ordered by value
    const l1 = await read('legacy-1')
    expect(l1.rating).toBe(5)
    expect(typeof l1.rating).toBe('number')
    expect(l1.reviewCreatedAt).toBe(1677605819601)
    expect(typeof l1.reviewCreatedAt).toBe('number')
    expect((await read('legacy-2')).rating).toBe(3)

    // modern doc untouched (still numeric, same value)
    expect((await read('modern-1')).rating).toBe(4.5)

    // review-only stays null (NOT coerced to 0); its createdAt string still
    // converts because the field is present and numeric-looking
    const ro = await read('review-only')
    expect(ro.rating).toBeNull()
    expect(ro.reviewCreatedAt).toBe(1680000000000)

    // rating-first: numeric rating kept, empty createdAt left as "" (not 0)
    const rf = await read('rating-first')
    expect(rf.rating).toBe(2)
    expect(rf.reviewCreatedAt).toBe('')

    // garbage left exactly as seeded — never NaN
    const g = await read('garbage-1')
    expect(g.rating).toBe('abc')
    expect(g.reviewCreatedAt).toBe('xyz')
  })

  test('a string rating sorts by value once normalized (the Top-sort bug)', async () => {
    const db = getDB()
    // "10" would sort ABOVE numeric 9 lexicographically, but 10 > 9 numerically.
    await db.collection('ratings').insertMany([
      { _id: 'a', recipeId: RECIPE, rating: '2' },
      { _id: 'b', recipeId: RECIPE, rating: 5 },
      { _id: 'c', recipeId: RECIPE, rating: '4' },
    ])

    await normalizeRatingTypes(db, { apply: true })

    const sorted = await db
      .collection('ratings')
      .find({ recipeId: RECIPE })
      .sort({ rating: -1 })
      .project({ rating: 1 })
      .toArray()
    // all numeric, descending by value — no string block interleaving
    expect(sorted.map((d) => d.rating)).toEqual([5, 4, 2])
  })

  test('apply is idempotent — a second run finds nothing to migrate', async () => {
    const db = getDB()
    await db.collection('ratings').insertMany(fixture())

    const first = await normalizeRatingTypes(db, { apply: true })
    expect(first.counts.migrated).toBe(3)

    const second = await normalizeRatingTypes(db, { apply: true })
    expect(second.counts.migrated).toBe(0)
    expect(second.counts.ratingFixed).toBe(0)
    expect(second.counts.createdAtFixed).toBe(0)
    // the garbage doc is still flagged on the rescan (needs manual attention)
    expect(second.counts.garbageDocs).toBe(1)
  })

  test('garbage values are reported via log, not written', async () => {
    const db = getDB()
    await db
      .collection('ratings')
      .insertOne({ _id: 'garbage-1', recipeId: RECIPE, rating: 'abc', reviewCreatedAt: 'xyz' })

    const lines = []
    const { counts } = await normalizeRatingTypes(db, { apply: true, log: (l) => lines.push(l) })

    expect(counts.garbageDocs).toBe(1)
    expect(counts.migrated).toBe(0)
    expect(lines.some((l) => l.includes('GARBAGE') && l.includes('rating'))).toBe(true)
    // unchanged on disk
    expect((await read('garbage-1')).rating).toBe('abc')
  })
})
