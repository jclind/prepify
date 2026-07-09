/**
 * W1 — scripts/migrateLegacyRecipeIds.js (Phase 5-D string→ObjectId migration).
 *
 * Runs the exported migration against the suite's in-memory replica set (the
 * same topology as prod Atlas, so the multi-document transaction is exercised
 * for real). Pins the invariants the prod run depends on:
 *   - hex-preserving convert: the doc re-appears under ObjectId(sameHex) with
 *     every other field byte-identical, and `String(_id)` is unchanged
 *   - foreign refs (ratings/reports/userRecipeData string ids) are NOT written,
 *     and still resolve through util/recipeIdQuery.js after the convert
 *   - dry run writes nothing; --apply is idempotent (second run finds 0)
 *   - non-hex string _ids and ObjectId-collision docs are reported + skipped,
 *     never half-migrated
 */
const { ObjectId } = require('mongodb')
const { getDB, getClient } = require('../db')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const {
  isLegacyHexObjectId,
  planLegacyIdMigration,
  migrateLegacyRecipeIds,
} = require('../scripts/migrateLegacyRecipeIds')

// A real legacy id shape from prod (24-char hex stored as a string).
const LEGACY_HEX = '63fe34ad3d057633b6e2970e'
const LEGACY_HEX_2 = '65302e782ea38768dea80749'
const NON_HEX = 'recipe_12345'

const legacyRecipe = (id, title) => ({
  _id: id,
  title,
  userId: 'owner-uid',
  authorUsername: 'chef',
  servings: 4,
  ingredients: [{ ingredientString: '1 cup flour' }],
  rating: { rateCount: 2, rateValue: 4.5 },
})

afterEach(async () => {
  const db = getDB()
  for (const coll of ['recipes', 'ratings', 'reports', 'userRecipeData']) {
    await db.collection(coll).deleteMany({})
  }
})

describe('isLegacyHexObjectId', () => {
  test('true only for a genuine 24-char hex string', () => {
    expect(isLegacyHexObjectId(LEGACY_HEX)).toBe(true)
    expect(isLegacyHexObjectId(NON_HEX)).toBe(false)
    // ObjectId.isValid is true for any 12-byte string — the round-trip must reject it
    expect(isLegacyHexObjectId('twelve-bytes')).toBe(false)
    expect(isLegacyHexObjectId(new ObjectId(LEGACY_HEX))).toBe(false)
    expect(isLegacyHexObjectId(null)).toBe(false)
  })
})

describe('planLegacyIdMigration', () => {
  test('classifies convert / skip-non-hex / skip-collision and ignores ObjectId docs', async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      legacyRecipe(LEGACY_HEX, 'Clean convert'),
      legacyRecipe(NON_HEX, 'Non-hex'),
      legacyRecipe(LEGACY_HEX_2, 'Collision'),
      // the collision: LEGACY_HEX_2's ObjectId form already exists as its own doc
      { _id: new ObjectId(LEGACY_HEX_2), title: 'Occupies the ObjectId slot' },
      { _id: new ObjectId(), title: 'Modern recipe — not part of the plan' },
    ])

    const plan = await planLegacyIdMigration(db)
    const byId = Object.fromEntries(plan.map((p) => [p.id, p.action]))
    expect(plan).toHaveLength(3)
    expect(byId[LEGACY_HEX]).toBe('convert')
    expect(byId[NON_HEX]).toBe('skip-non-hex')
    expect(byId[LEGACY_HEX_2]).toBe('skip-collision')
  })

  test('counts the string refs per recipe (informational)', async () => {
    const db = getDB()
    await db.collection('recipes').insertOne(legacyRecipe(LEGACY_HEX, 'Referenced'))
    await db.collection('ratings').insertMany([
      { recipeId: LEGACY_HEX, userId: 'u1', rating: 5 },
      { recipeId: LEGACY_HEX, userId: 'u2', rating: 4 },
    ])
    await db.collection('reports').insertOne({ recipeId: LEGACY_HEX, targetType: 'recipe' })
    await db.collection('userRecipeData').insertMany([
      { _id: 'uid-a', savedRecipes: [{ recipeId: LEGACY_HEX }] },
      { _id: 'uid-b', madeRecipes: [{ recipeId: LEGACY_HEX }], userRecipes: [] },
      { _id: 'uid-c', savedRecipes: [{ recipeId: 'some-other-recipe' }] },
    ])

    const [entry] = await planLegacyIdMigration(db)
    expect(entry.refs).toEqual({
      ratings: 2,
      reports: 1,
      'userRecipeData lists': 2,
    })
  })
})

describe('migrateLegacyRecipeIds', () => {
  test('dry run (default) writes nothing', async () => {
    const db = getDB()
    await db.collection('recipes').insertOne(legacyRecipe(LEGACY_HEX, 'Untouched'))

    const { counts } = await migrateLegacyRecipeIds(getClient(), db)

    expect(counts).toEqual({ legacy: 1, converted: 1, skippedNonHex: 0, skippedCollision: 0 })
    // still the string doc, no ObjectId twin
    expect(await db.collection('recipes').findOne({ _id: LEGACY_HEX })).not.toBeNull()
    expect(await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX) })).toBeNull()
  })

  test('apply converts under the SAME hex with every other field intact', async () => {
    const db = getDB()
    const original = legacyRecipe(LEGACY_HEX, 'Yogurt and Fruit Parfaits')
    await db.collection('recipes').insertOne(original)

    const { counts } = await migrateLegacyRecipeIds(getClient(), db, { apply: true })
    expect(counts.converted).toBe(1)

    expect(await db.collection('recipes').findOne({ _id: LEGACY_HEX })).toBeNull()
    const migrated = await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX) })
    expect(migrated).not.toBeNull()
    // the string form is byte-identical — this is what keeps every ref resolving
    expect(String(migrated._id)).toBe(LEGACY_HEX)
    const { _id, ...rest } = migrated
    const { _id: _oldId, ...expected } = original
    expect(rest).toEqual(expected)
  })

  test('foreign string refs are not written and still resolve via recipeIdQuery', async () => {
    const db = getDB()
    await db.collection('recipes').insertOne(legacyRecipe(LEGACY_HEX, 'Referenced'))
    const rating = { recipeId: LEGACY_HEX, userId: 'u1', rating: 5 }
    await db.collection('ratings').insertOne(rating)
    await db.collection('userRecipeData').insertOne({
      _id: 'uid-a',
      savedRecipes: [{ recipeId: LEGACY_HEX, dateSaved: '1677605819601' }],
    })

    await migrateLegacyRecipeIds(getClient(), db, { apply: true })

    // refs byte-identical (never written) …
    expect(await db.collection('ratings').findOne({ recipeId: LEGACY_HEX })).toMatchObject(rating)
    expect(
      await db.collection('userRecipeData').findOne({ 'savedRecipes.recipeId': LEGACY_HEX })
    ).not.toBeNull()
    // … and the app's lookup path — string id through the shim — finds the migrated doc
    const viaShim = await db.collection('recipes').findOne(recipeIdQuery(LEGACY_HEX))
    expect(viaShim).not.toBeNull()
    expect(String(viaShim._id)).toBe(LEGACY_HEX)
  })

  test('apply is idempotent — a second run finds nothing to do', async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      legacyRecipe(LEGACY_HEX, 'One'),
      legacyRecipe(LEGACY_HEX_2, 'Two'),
    ])

    const first = await migrateLegacyRecipeIds(getClient(), db, { apply: true })
    expect(first.counts).toMatchObject({ legacy: 2, converted: 2 })

    const second = await migrateLegacyRecipeIds(getClient(), db, { apply: true })
    expect(second.counts).toEqual({ legacy: 0, converted: 0, skippedNonHex: 0, skippedCollision: 0 })
    expect(await db.collection('recipes').countDocuments({ _id: { $type: 'string' } })).toBe(0)
    expect(await db.collection('recipes').countDocuments({})).toBe(2)
  })

  test('onlyId targets a single doc and leaves the other legacy docs pending', async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      legacyRecipe(LEGACY_HEX, 'Targeted'),
      legacyRecipe(LEGACY_HEX_2, 'Left alone'),
    ])

    const { counts } = await migrateLegacyRecipeIds(getClient(), db, {
      apply: true,
      onlyId: LEGACY_HEX,
    })

    expect(counts).toMatchObject({ legacy: 1, converted: 1 })
    expect(await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX) })).not.toBeNull()
    // the untargeted legacy doc is still the string doc
    expect(await db.collection('recipes').findOne({ _id: LEGACY_HEX_2 })).not.toBeNull()
    expect(await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX_2) })).toBeNull()

    // an --id pointing at an already-migrated (ObjectId) recipe plans nothing
    const rerun = await migrateLegacyRecipeIds(getClient(), db, {
      apply: true,
      onlyId: LEGACY_HEX,
    })
    expect(rerun.counts.legacy).toBe(0)
  })

  test('non-hex and collision docs are skipped untouched, others still convert', async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      legacyRecipe(LEGACY_HEX, 'Converts'),
      legacyRecipe(NON_HEX, 'Non-hex survivor'),
      legacyRecipe(LEGACY_HEX_2, 'Collision survivor'),
      { _id: new ObjectId(LEGACY_HEX_2), title: 'Occupies the ObjectId slot' },
    ])

    const lines = []
    const { counts } = await migrateLegacyRecipeIds(getClient(), db, {
      apply: true,
      log: (l) => lines.push(l),
    })

    expect(counts).toEqual({ legacy: 3, converted: 1, skippedNonHex: 1, skippedCollision: 1 })
    // skipped docs byte-identical in place
    expect(await db.collection('recipes').findOne({ _id: NON_HEX })).toMatchObject({
      title: 'Non-hex survivor',
    })
    expect(await db.collection('recipes').findOne({ _id: LEGACY_HEX_2 })).toMatchObject({
      title: 'Collision survivor',
    })
    // the collision's ObjectId doc was not overwritten
    expect(
      await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX_2) })
    ).toMatchObject({ title: 'Occupies the ObjectId slot' })
    // the clean one converted
    expect(await db.collection('recipes').findOne({ _id: new ObjectId(LEGACY_HEX) })).not.toBeNull()
    // and both skips were reported, not silent
    expect(lines.some((l) => l.includes('SKIP') && l.includes('not a 24-char hex'))).toBe(true)
    expect(lines.some((l) => l.includes('SKIP') && l.includes('already exists'))).toBe(true)
  })
})
