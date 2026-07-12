/**
 * Audit H1 — daily paid-API spend ceiling.
 *
 * Exercises the counter core (bumpAndCheckQuota) directly against the in-memory
 * Mongo, rather than through a route: the middleware itself is skipped under
 * NODE_ENV=test (like every sibling rate limiter, so the supertest suites aren't
 * throttled), so the DB-backed decision logic is what needs coverage. `now` is
 * injected so the UTC-day rollover is deterministic without touching the clock.
 */
const { getDB } = require('../db')
const { bumpAndCheckQuota, utcDayKey } = require('../util/paidQuota')

const DAY1 = new Date('2026-07-11T12:00:00Z')
const DAY2 = new Date('2026-07-12T00:30:00Z')

afterEach(async () => {
  await getDB().collection('paidQuota').deleteMany({})
})

const bump = (opts) => bumpAndCheckQuota(getDB(), { surface: 'test', now: DAY1, ...opts })

describe('bumpAndCheckQuota — per-account daily cap', () => {
  it('allows exactly perUserDaily calls, then rejects with scope=user', async () => {
    const opts = { uid: 'u1', perUserDaily: 3, globalDaily: 1000 }
    expect((await bump(opts)).allowed).toBe(true) // 1
    expect((await bump(opts)).allowed).toBe(true) // 2
    expect((await bump(opts)).allowed).toBe(true) // 3
    const over = await bump(opts) // 4
    expect(over.allowed).toBe(false)
    expect(over.scope).toBe('user')
    expect(over.cap).toBe(3)
  })

  it('keeps each account on its own budget (isolation)', async () => {
    const a = { uid: 'a', perUserDaily: 1, globalDaily: 1000 }
    const b = { uid: 'b', perUserDaily: 1, globalDaily: 1000 }
    expect((await bump(a)).allowed).toBe(true)
    expect((await bump(a)).allowed).toBe(false) // a is capped
    expect((await bump(b)).allowed).toBe(true) // b still has its own allowance
  })
})

describe('bumpAndCheckQuota — global daily ceiling (Sybil defeater)', () => {
  it('rejects a FRESH account once the aggregate ceiling is spent, even under its own cap', async () => {
    // Per-account cap is generous (100); the global ceiling is 5.
    const mk = (uid) => ({ uid, perUserDaily: 100, globalDaily: 5 })
    // userA spends 3 (all allowed) → global = 3.
    for (let i = 0; i < 3; i++) expect((await bump(mk('userA'))).allowed).toBe(true)
    // A brand-new account gets 2 more (global 4, 5) then is stopped by the GLOBAL
    // ceiling on its 3rd — despite being far under its own per-account cap.
    expect((await bump(mk('sybil'))).allowed).toBe(true) // global 4
    expect((await bump(mk('sybil'))).allowed).toBe(true) // global 5
    const blocked = await bump(mk('sybil')) // global 6 > 5
    expect(blocked.allowed).toBe(false)
    expect(blocked.scope).toBe('global')
    expect(blocked.cap).toBe(5)
  })

  it('does NOT bump the global counter when the per-account cap already rejected', async () => {
    const opts = { uid: 'u', perUserDaily: 1, globalDaily: 100 }
    await bump(opts) // allowed → global 1
    await bump(opts) // rejected at per-account, global must stay 1
    const globalDoc = await getDB()
      .collection('paidQuota')
      .findOne({ _id: `${utcDayKey(DAY1)}:test:g` })
    expect(globalDoc.count).toBe(1)
  })
})

describe('bumpAndCheckQuota — daily window', () => {
  it('resets counters when the UTC day rolls over', async () => {
    const opts = { uid: 'u', perUserDaily: 1, globalDaily: 1000 }
    expect((await bump(opts)).allowed).toBe(true) // day1: 1
    expect((await bump(opts)).allowed).toBe(false) // day1: capped
    // Same uid/caps, next UTC day → fresh counter, allowed again.
    const nextDay = await bumpAndCheckQuota(getDB(), { surface: 'test', now: DAY2, ...opts })
    expect(nextDay.allowed).toBe(true)
  })

  it('stamps expireAt for TTL cleanup', async () => {
    await bump({ uid: 'u', perUserDaily: 5, globalDaily: 5 })
    const doc = await getDB()
      .collection('paidQuota')
      .findOne({ _id: `${utcDayKey(DAY1)}:test:u:u` })
    expect(doc.expireAt instanceof Date).toBe(true)
    expect(doc.expireAt.getTime()).toBeGreaterThan(DAY1.getTime())
  })
})
