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
})
