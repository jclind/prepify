import { vi } from 'vitest'
import DraftAPI from 'src/api/drafts'
import AuthAPI from 'src/api/auth'
import { getCachedIdToken } from 'src/api/http-common'
import { RecipeDraftContent } from 'types'

// The keepalive flush must not depend on Firebase init or a real axios instance,
// so stub the auth/token surface it reads. API_BASE_URL is fixed for a stable
// URL assertion.
vi.mock('src/api/http-common', () => ({
  API_BASE_URL: 'http://api.test',
  http: {},
  getCachedIdToken: vi.fn(),
  warmIdToken: vi.fn(),
}))
vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn() },
}))

const mockedAuth = AuthAPI as unknown as { getUID: ReturnType<typeof vi.fn> }
const mockedGetToken = getCachedIdToken as unknown as ReturnType<typeof vi.fn>

const content: RecipeDraftContent = { title: 'Soup', description: 'Cozy' }

beforeEach(() => {
  vi.clearAllMocks()
  mockedAuth.getUID.mockReturnValue('uid-1')
  mockedGetToken.mockReturnValue('tok-abc')
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DraftAPI.flushDraftKeepalive', () => {
  it('PUTs an existing draft with the updatedAt precondition and a keepalive Bearer request', () => {
    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(true)

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(url).toBe('http://api.test/api/drafts/draft-1')
    expect(init.method).toBe('PUT')
    expect(init.keepalive).toBe(true)
    expect(init.headers.Authorization).toBe('Bearer tok-abc')
    // The B5 concurrency field must ride along with the content.
    expect(JSON.parse(init.body)).toEqual({ ...content, updatedAt: '1000' })
  })

  it('POSTs a brand-new draft (no id) without an updatedAt field', () => {
    DraftAPI.flushDraftKeepalive(null, content, '')

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(url).toBe('http://api.test/api/drafts')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(content)
  })

  it('does not fire without a signed-in user', () => {
    mockedAuth.getUID.mockReturnValue(null)
    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not fire without a cached token', () => {
    mockedGetToken.mockReturnValue(null)
    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  // Wait a macrotask so the fetch `.then`/`.json()` chain (and any retry) runs.
  const flushMicrotasks = () => new Promise(res => setTimeout(res, 0))

  it('retries the PUT once against the server’s latest version on a 409, so the newest edits win the unload race (W15 bug 1)', async () => {
    // Models bug 1: this keepalive PUT and a normal autosave that was still in
    // flight both carried the same base updatedAt ('1000'). The older in-flight
    // save landed first, bumping the stored version to '2000', so this PUT 409s.
    // Pre-fix it was dropped and the newest edits were silently lost; post-fix it
    // retries once against '2000' and supersedes the older write.
    const conflict = new Response(
      JSON.stringify({ code: 'DRAFT_CONFLICT', draft: { updatedAt: '2000' } }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
    const ok = new Response(null, { status: 200 })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(conflict)
      .mockResolvedValueOnce(ok)
    vi.stubGlobal('fetch', fetchMock)

    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(true)
    await flushMicrotasks()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    // The retry carries the SAME (newest) content but the server's fresh version.
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(retryBody).toEqual({ ...content, updatedAt: '2000' })
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    expect(fetchMock.mock.calls[1][1].keepalive).toBe(true)
  })

  it('does not retry when the 409 body carries no fresher version', async () => {
    const conflict = new Response(
      JSON.stringify({ code: 'DRAFT_CONFLICT' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    )
    const fetchMock = vi.fn().mockResolvedValue(conflict)
    vi.stubGlobal('fetch', fetchMock)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    await flushMicrotasks()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('does not treat a 429 POST as a success — reports the failed create (W15 bug 2)', async () => {
    // Bug 2: a 429 is a *resolved* fetch, so the pre-fix `.catch`-only handler
    // never saw it and the flush behaved as if the draft was created. Check
    // res.ok so a resolved-but-non-2xx create surfaces as a failure.
    const tooMany = new Response(JSON.stringify({ code: 'RATE_LIMITED' }), {
      status: 429,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(tooMany))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // id null → POST /api/drafts (create).
    const fired = DraftAPI.flushDraftKeepalive(null, content, '')
    expect(fired).toBe(true)
    await flushMicrotasks()

    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('does not report a failure on a 2xx create', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 201 })))
    )
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    DraftAPI.flushDraftKeepalive(null, content, '')
    await flushMicrotasks()

    expect(errSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
