const { upsertWithDupRetry } = require('../util/upsertWithDupRetry')

// A minimal fake collection whose updateOne is a jest mock, so we can assert how
// upsertWithDupRetry calls it without needing a live unique index/race.
const makeCollection = () => ({ updateOne: jest.fn() })

const FILTER = { userId: 'u1', recipeId: 'r1' }
const UPDATE = { $set: { reviewText: 'hi' }, $setOnInsert: { username: 'me' } }

describe('upsertWithDupRetry', () => {
  it('does a single upsert when there is no collision', async () => {
    const col = makeCollection()
    col.updateOne.mockResolvedValueOnce({ upsertedCount: 1 })

    const res = await upsertWithDupRetry(col, FILTER, UPDATE)

    expect(col.updateOne).toHaveBeenCalledTimes(1)
    expect(col.updateOne).toHaveBeenCalledWith(FILTER, UPDATE, { upsert: true })
    expect(res).toEqual({ upsertedCount: 1 })
  })

  it('retries as a plain (non-upsert) update on a duplicate-key race (E11000)', async () => {
    const col = makeCollection()
    const dupErr = Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    col.updateOne
      .mockRejectedValueOnce(dupErr) // loser of the insert race
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 }) // retry lands on the winner's doc

    const res = await upsertWithDupRetry(col, FILTER, UPDATE)

    expect(col.updateOne).toHaveBeenCalledTimes(2)
    expect(col.updateOne).toHaveBeenNthCalledWith(1, FILTER, UPDATE, { upsert: true })
    expect(col.updateOne).toHaveBeenNthCalledWith(2, FILTER, UPDATE, { upsert: false })
    expect(res).toEqual({ matchedCount: 1, modifiedCount: 1 })
  })

  it('rethrows non-duplicate errors without retrying', async () => {
    const col = makeCollection()
    col.updateOne.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 42 }))

    await expect(upsertWithDupRetry(col, FILTER, UPDATE)).rejects.toThrow('boom')
    expect(col.updateOne).toHaveBeenCalledTimes(1)
  })

  it('preserves caller-supplied options (e.g. session) on both attempts', async () => {
    const col = makeCollection()
    const session = { id: 'sess' }
    const dupErr = Object.assign(new Error('dup'), { code: 11000 })
    col.updateOne.mockRejectedValueOnce(dupErr).mockResolvedValueOnce({ matchedCount: 1 })

    await upsertWithDupRetry(col, FILTER, UPDATE, { session })

    expect(col.updateOne).toHaveBeenNthCalledWith(1, FILTER, UPDATE, { session, upsert: true })
    expect(col.updateOne).toHaveBeenNthCalledWith(2, FILTER, UPDATE, { session, upsert: false })
  })
})
