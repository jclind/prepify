import { vi } from 'vitest'
import { withChunkReload } from 'src/util/lazyRoute'

const FLAG = 'prepify:chunk-reload'

describe('withChunkReload', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('passes a successful load through without touching the flag', async () => {
    sessionStorage.setItem(FLAG, '1')
    const reload = vi.fn()
    const load = withChunkReload(
      () => Promise.resolve({ default: 'page' }),
      reload
    )

    await expect(load()).resolves.toEqual({ default: 'page' })
    // Never auto-cleared — see the loop rationale in lazyRoute.ts.
    expect(sessionStorage.getItem(FLAG)).toBe('1')
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once on a failed chunk load, then fails the route if the reload never happens', async () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    const load = withChunkReload(
      () => Promise.reject(new Error('failed to fetch chunk')),
      reload
    )

    const pending = load()
    // Attach the rejection expectation before time advances (avoids an
    // unhandled-rejection warning), then run out the 5 s stuck-reload window.
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'ChunkLoadError',
    })
    await vi.advanceTimersByTimeAsync(5000)
    await assertion

    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(FLAG)).toBe('1')
  })

  it('rethrows a tagged ChunkLoadError if a chunk still fails after a reload', async () => {
    sessionStorage.setItem(FLAG, '1')
    const reload = vi.fn()
    const err = new Error('still failing')
    const load = withChunkReload(() => Promise.reject(err), reload)

    await expect(load()).rejects.toBe(err)
    expect(err.name).toBe('ChunkLoadError')
    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload while offline — the failure surfaces to the error boundary', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const reload = vi.fn()
    const load = withChunkReload(
      () => Promise.reject(new Error('failed to fetch chunk')),
      reload
    )

    await expect(load()).rejects.toMatchObject({ name: 'ChunkLoadError' })
    expect(reload).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(FLAG)).toBeNull()
  })

  it('never reloads when sessionStorage is blocked (throws on access)', async () => {
    // jsdom's Storage is a Proxy that vi.spyOn can't shadow — swap the whole
    // global for one whose access throws, like a storage-blocked browser.
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    })
    const reload = vi.fn()
    const load = withChunkReload(
      () => Promise.reject(new Error('failed to fetch chunk')),
      reload
    )

    await expect(load()).rejects.toMatchObject({ name: 'ChunkLoadError' })
    expect(reload).not.toHaveBeenCalled()
  })
})
