/**
 * P2 — image moderation foundation (util/imageModeration).
 *
 * Pure-unit: no DB, no app. `fetch` is replaced per-test so the Vision layer is
 * exercised without a network call. Contract under test:
 *   - no-ops to CLEAN when GOOGLE_VISION_API_KEY is unset (or MODERATION_ENABLED=false),
 *   - SafeSearch likelihoods grade into high/medium/clean at the configured thresholds,
 *   - 'racy' only ever contributes medium, never high,
 *   - a scan failure (throw / non-2xx / per-image error) fails CLOSED (medium, not allowed).
 */

const { moderateImage, grade } = require('../util/imageModeration')

const realFetch = global.fetch
const URL = 'https://firebasestorage.googleapis.com/v0/b/x/o/recipeImages%2Fp.jpg?alt=media&token=t'

// Build a fake fetch resolving to one Vision SafeSearch response.
function mockSafeSearch(annotation) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ responses: [{ safeSearchAnnotation: annotation }] }),
  })
}

beforeEach(() => {
  process.env.GOOGLE_VISION_API_KEY = 'test-key'
  delete process.env.MODERATION_ENABLED
  delete process.env.MODERATION_IMAGE_HIGH
  delete process.env.MODERATION_IMAGE_MEDIUM
})

afterEach(() => {
  global.fetch = realFetch
  jest.restoreAllMocks()
})

// process.env is shared across files under --runInBand; don't leak an enabled
// image key into later route suites (it would make them hit the real API).
afterAll(() => {
  delete process.env.GOOGLE_VISION_API_KEY
})

describe('imageModeration — env gating', () => {
  it('no-ops to a CLEAN/allowed verdict when no key is set (never calls Vision)', async () => {
    delete process.env.GOOGLE_VISION_API_KEY
    global.fetch = jest.fn()
    const v = await moderateImage(URL, 'recipe.image')
    expect(v).toMatchObject({ allowed: true, severity: 'clean', source: 'disabled' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no-ops when MODERATION_ENABLED=false even with a key present', async () => {
    process.env.MODERATION_ENABLED = 'false'
    global.fetch = jest.fn()
    const v = await moderateImage(URL)
    expect(v.allowed).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('treats an empty / missing URL as clean without scanning', async () => {
    global.fetch = jest.fn()
    expect((await moderateImage('')).source).toBe('empty')
    expect((await moderateImage(null)).source).toBe('empty')
    expect((await moderateImage('   ')).source).toBe('empty')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('imageModeration — grading', () => {
  it('grades adult VERY_LIKELY as HIGH (block) and not allowed', async () => {
    mockSafeSearch({ adult: 'VERY_LIKELY', violence: 'UNLIKELY', racy: 'POSSIBLE' })
    const v = await moderateImage(URL, 'recipe.image')
    expect(v).toMatchObject({ allowed: false, severity: 'high', category: 'adult', source: 'vision' })
    expect(v.reason).toBe('vision:adult:VERY_LIKELY')
  })

  it('grades violence VERY_LIKELY as HIGH', async () => {
    mockSafeSearch({ adult: 'UNLIKELY', violence: 'VERY_LIKELY', racy: 'UNLIKELY' })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ severity: 'high', category: 'violence' })
  })

  it('grades adult LIKELY (below high) as MEDIUM (hold)', async () => {
    mockSafeSearch({ adult: 'LIKELY', violence: 'UNLIKELY', racy: 'UNLIKELY' })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ allowed: false, severity: 'medium', category: 'adult' })
  })

  it('racy only ever contributes MEDIUM, and only at VERY_LIKELY', async () => {
    mockSafeSearch({ adult: 'UNLIKELY', violence: 'UNLIKELY', racy: 'VERY_LIKELY' })
    expect((await moderateImage(URL)).severity).toBe('medium')

    mockSafeSearch({ adult: 'UNLIKELY', violence: 'UNLIKELY', racy: 'LIKELY' })
    expect((await moderateImage(URL)).severity).toBe('clean')
  })

  it('grades an all-clear image as CLEAN/allowed', async () => {
    mockSafeSearch({ adult: 'VERY_UNLIKELY', violence: 'UNLIKELY', racy: 'POSSIBLE' })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ allowed: true, severity: 'clean', reason: null })
  })

  it('handles UNKNOWN / missing likelihoods as no signal (clean)', () => {
    expect(grade({}).severity).toBe('clean')
    expect(grade({ adult: 'UNKNOWN', violence: 'UNKNOWN', racy: 'UNKNOWN' }).severity).toBe('clean')
  })

  it('honors env threshold overrides', async () => {
    process.env.MODERATION_IMAGE_HIGH = 'LIKELY'
    mockSafeSearch({ adult: 'LIKELY', violence: 'UNLIKELY', racy: 'UNLIKELY' })
    expect((await moderateImage(URL)).severity).toBe('high')
  })
})

describe('imageModeration — fail CLOSED', () => {
  it('treats a thrown fetch as MEDIUM / not-allowed (held, not published)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const v = await moderateImage(URL, 'recipe.image')
    expect(v).toMatchObject({ allowed: false, severity: 'medium', category: 'unscanned', source: 'error' })
  })

  it('fails closed on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ allowed: false, severity: 'medium', source: 'error' })
  })

  it('fails closed when Vision reports a per-image error (bad/unreachable URL)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responses: [{ error: { code: 3, message: 'Bad image data' } }] }),
    })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ allowed: false, severity: 'medium', source: 'error' })
  })

  it('fails closed on a 200 with no error AND no annotation (never publishes unscanned)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responses: [{}] }),
    })
    const v = await moderateImage(URL)
    expect(v).toMatchObject({ allowed: false, severity: 'medium', source: 'error' })
  })
})
