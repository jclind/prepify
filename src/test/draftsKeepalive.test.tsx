import { vi } from 'vitest'
import DraftAPI from 'src/api/drafts'
import AuthAPI from 'src/api/auth'
import { getCachedIdToken, http } from 'src/api/http-common'
import { RecipeDraftContent } from 'types'

// The keepalive flush must not depend on Firebase init or a real axios instance,
// so stub the auth/token surface it reads. API_BASE_URL is fixed for a stable
// URL assertion.
vi.mock('src/api/http-common', () => ({
  API_BASE_URL: 'http://api.test',
  // `put` is stubbed so the debounced-autosave path (updateDraft) can be
  // exercised alongside the keepalive flush, to prove only the flush sets the
  // supersede flag.
  http: { put: vi.fn() },
  getCachedIdToken: vi.fn(),
  warmIdToken: vi.fn(),
}))
vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn() },
}))

const mockedAuth = AuthAPI as unknown as { getUID: ReturnType<typeof vi.fn> }
const mockedGetToken = getCachedIdToken as unknown as ReturnType<typeof vi.fn>
const mockedPut = (http as unknown as { put: ReturnType<typeof vi.fn> }).put

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
  it('PUTs an existing draft with supersede:true and a keepalive Bearer request (W16)', () => {
    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(true)

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(url).toBe('http://api.test/api/drafts/draft-1')
    expect(init.method).toBe('PUT')
    expect(init.keepalive).toBe(true)
    expect(init.headers.Authorization).toBe('Bearer tok-abc')
    // The flush sends supersede:true so the server writes unconditionally and it
    // can't 409 against a racing autosave. The base updatedAt still rides along
    // (parity/observability); the server ignores it on the supersede path.
    const body = JSON.parse(init.body)
    expect(body).toEqual({ ...content, updatedAt: '1000', supersede: true })
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

  it('does not retry the PUT — a supersede flush cannot 409, so the #311 retry dance is gone (W16)', async () => {
    // Post-W16 the flush sets supersede:true, so the server writes
    // unconditionally and the "PUT lost the unload race" 409 can no longer
    // happen. There is a single PUT and no conditional retry.
    const ok = new Response(null, { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(ok)
    vi.stubGlobal('fetch', fetchMock)

    const fired = DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    expect(fired).toBe(true)
    await flushMicrotasks()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      ...content,
      updatedAt: '1000',
      supersede: true,
    })
  })

  it('gives up (logs, no recreate) when the superseding PUT 404s — the draft was deleted elsewhere (#307)', async () => {
    // A supersede PUT still 404s if the draft was deleted while this tab held it
    // open. The flush must NOT resurrect it (no retry, no create) — it just logs.
    const gone = new Response(JSON.stringify({ error: 'Draft not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
    const fetchMock = vi.fn().mockResolvedValue(gone)
    vi.stubGlobal('fetch', fetchMock)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    DraftAPI.flushDraftKeepalive('draft-1', content, '1000')
    await flushMicrotasks()

    // Exactly one request (the PUT); no follow-up create/retry.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
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

describe('DraftAPI.updateDraft — regular autosave never supersedes (W16)', () => {
  it('sends only the content + updatedAt precondition, and NO supersede flag', async () => {
    mockedPut.mockResolvedValue({ data: { ...content, updatedAt: '2000' } })

    await DraftAPI.updateDraft('draft-1', content, '1000')

    expect(mockedPut).toHaveBeenCalledTimes(1)
    const [url, body] = mockedPut.mock.calls[0]
    expect(url).toBe('api/drafts/draft-1')
    // The supersede bypass is the flush's alone; a debounced save stays
    // precondition-guarded so a real cross-tab conflict still 409s.
    expect(body).toEqual({ ...content, updatedAt: '1000' })
    expect('supersede' in body).toBe(false)
  })
})
