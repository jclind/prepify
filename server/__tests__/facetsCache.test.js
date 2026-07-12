const { createTTLCache, DEFAULT_TTL_MS } = require('../util/facetsCache')

// A tiny controllable clock so TTL expiry is deterministic without fake timers.
function fakeClock(start = 1000) {
  let t = start
  return { now: () => t, advance: (ms) => { t += ms } }
}

// A compute() whose resolution the test controls, to exercise in-flight sharing.
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

describe('createTTLCache', () => {
  it('computes once and serves subsequent hits from cache within the TTL', async () => {
    const clock = fakeClock()
    const cache = createTTLCache({ ttlMs: 1000, now: clock.now })
    const compute = jest.fn().mockResolvedValue('v1')

    expect(await cache.get(compute)).toBe('v1')
    clock.advance(999) // still inside the window
    expect(await cache.get(compute)).toBe('v1')

    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('recomputes after the TTL elapses', async () => {
    const clock = fakeClock()
    const cache = createTTLCache({ ttlMs: 1000, now: clock.now })
    const compute = jest.fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2')

    expect(await cache.get(compute)).toBe('v1')
    clock.advance(1000) // TTL is exclusive (now - at < ttl), so 1000 is expired
    expect(await cache.get(compute)).toBe('v2')

    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('recomputes on the next get after invalidate()', async () => {
    const clock = fakeClock()
    const cache = createTTLCache({ ttlMs: 60000, now: clock.now })
    const compute = jest.fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2')

    expect(await cache.get(compute)).toBe('v1')
    cache.invalidate()
    expect(await cache.get(compute)).toBe('v2') // well within the TTL, but busted

    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('shares a single in-flight compute across concurrent callers', async () => {
    const cache = createTTLCache({ ttlMs: 60000 })
    const d = deferred()
    const compute = jest.fn().mockReturnValue(d.promise)

    const a = cache.get(compute)
    const b = cache.get(compute) // arrives before the first resolves
    d.resolve('shared')

    expect(await a).toBe('shared')
    expect(await b).toBe('shared')
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('does not cache a result from a compute that was invalidated mid-flight', async () => {
    const clock = fakeClock()
    const cache = createTTLCache({ ttlMs: 60000, now: clock.now })
    const d = deferred()
    const compute = jest.fn()
      .mockReturnValueOnce(d.promise) // slow, stale scan
      .mockResolvedValueOnce('fresh')

    const stale = cache.get(compute)
    cache.invalidate() // a write landed while the scan was running
    d.resolve('stale')

    // The in-flight caller still gets its value…
    expect(await stale).toBe('stale')
    // …but it was NOT written to the cache, so the next get recomputes.
    expect(await cache.get(compute)).toBe('fresh')
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('defaults to a 5-minute TTL', () => {
    expect(DEFAULT_TTL_MS).toBe(5 * 60 * 1000)
  })
})
