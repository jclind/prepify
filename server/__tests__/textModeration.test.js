/**
 * P0 — text moderation foundation (util/textModeration + util/moderationBlocklist).
 *
 * Pure-unit: no DB, no app. `fetch` is replaced per-test so the OpenAI layer is
 * exercised without a network call. Contract under test:
 *   - blocklist hits are high-confidence and fire even with the API disabled,
 *   - the wrapper no-ops to CLEAN when OPENAI_API_KEY is unset,
 *   - API scores grade into high/medium/clean at the configured thresholds,
 *   - a transient API failure fails OPEN (clean), never throwing.
 */

const { moderateText } = require('../util/textModeration')
const { checkBlocklist, normalizeToken } = require('../util/moderationBlocklist')

const realFetch = global.fetch

// Build a fake fetch resolving to one OpenAI moderation result.
function mockModeration({ flagged = false, categories = {}, category_scores = {} }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [{ flagged, categories, category_scores }] }),
  })
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
  delete process.env.MODERATION_ENABLED
  delete process.env.MODERATION_HIGH_THRESHOLD
  delete process.env.MODERATION_MEDIUM_THRESHOLD
})

afterEach(() => {
  global.fetch = realFetch
  jest.restoreAllMocks()
})

// process.env is shared across files under --runInBand; don't leak an enabled
// moderation key (or it would make later route suites hit the real API).
afterAll(() => {
  delete process.env.OPENAI_API_KEY
})

describe('moderationBlocklist.checkBlocklist', () => {
  it('catches an exact slur token', () => {
    expect(checkBlocklist('you are a bitch', 'review')).toMatchObject({ kind: 'slur' })
  })

  it('catches leetspeak / obfuscated slurs', () => {
    expect(checkBlocklist('f4ggot', 'review')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('sh1t', 'review')).toMatchObject({ kind: 'slur' })
  })

  it('does not false-positive on clean text (Scunthorpe-safe)', () => {
    expect(checkBlocklist('Scunthorpe assistant classic recipe', 'recipe.title')).toBeNull()
    expect(checkBlocklist('A delicious shiitake mushroom risotto', 'recipe.title')).toBeNull()
  })

  it('catches concatenated/embedded slurs everywhere via the hard-slur substring pass', () => {
    // Hard, unambiguous stems are substring-matched on any surface.
    expect(checkBlocklist('what a niggerlover', 'review')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('megaasshole energy', 'recipe.description')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('xXcuntXx', 'recipe.title')).toMatchObject({ kind: 'slur' })
  })

  it('catches soft concatenated slurs on identity fields but leaves prose to the API', () => {
    // "shitfuck" is substring-matched on short identity fields…
    expect(checkBlocklist('shitfuck', 'username')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('shitlord', 'displayName')).toMatchObject({ kind: 'slur' })
    // …but NOT substring-scanned in long-form prose (the OpenAI layer backstops it).
    expect(checkBlocklist('this shitfuck of a day', 'review')).toBeNull()
  })

  it('defeats letter-spacing evasion', () => {
    expect(checkBlocklist('s h i t', 'username')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('n i g g e r', 'review')).toMatchObject({ kind: 'slur' })
    expect(checkBlocklist('you f.u.c.k', 'review')).toMatchObject({ kind: 'slur' })
  })

  it('keeps the substring pass Scunthorpe-safe via the benign allowlist', () => {
    // "Scunthorpe" (contains cunt) and the shitake/retardant family must pass even
    // where the hard-slur substring pass would otherwise fire.
    expect(checkBlocklist('greetings from Scunthorpe', 'review')).toBeNull()
    expect(checkBlocklist('shitake mushroom stir fry', 'recipe.title')).toBeNull()
    expect(checkBlocklist('coat the pan with fire retardant', 'recipe.description')).toBeNull()
    // Even as an identity field (where soft substrings fire), allowlisted words pass.
    expect(checkBlocklist('Scunthorpe', 'username')).toBeNull()
  })

  it('applies URL/domain spam rules only to identity fields', () => {
    expect(checkBlocklist('visit www.spam.com', 'username')).toMatchObject({ kind: 'spam' })
    // A recipe body legitimately contains links — not flagged by the blocklist.
    expect(checkBlocklist('adapted from www.spam.com', 'recipe.description')).toBeNull()
  })

  it('normalizeToken folds case, leet, and repeats', () => {
    expect(normalizeToken('Fuuuck')).toBe('fuck')
    expect(normalizeToken('SH!T')).toBe('sht')
  })
})

describe('moderateText — gating', () => {
  it('no-ops to clean when OPENAI_API_KEY is absent (and no blocklist hit)', async () => {
    delete process.env.OPENAI_API_KEY
    global.fetch = jest.fn()
    const v = await moderateText('a perfectly normal sentence', 'review')
    expect(v).toMatchObject({ allowed: true, severity: 'clean', source: 'disabled' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still blocks blocklist hits even when the API is disabled', async () => {
    delete process.env.OPENAI_API_KEY
    const v = await moderateText('total bitch move', 'review')
    expect(v).toMatchObject({ allowed: false, severity: 'high', source: 'blocklist' })
  })

  it('treats empty/blank text as clean without calling the API', async () => {
    global.fetch = jest.fn()
    expect(await moderateText('', 'bio')).toMatchObject({ allowed: true, severity: 'clean' })
    expect(await moderateText('   ', 'bio')).toMatchObject({ allowed: true, severity: 'clean' })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('moderateText — OpenAI grading', () => {
  it('grades a high score as high', async () => {
    mockModeration({ flagged: true, category_scores: { hate: 0.97 } })
    const v = await moderateText('borderline content', 'review')
    expect(v).toMatchObject({ allowed: false, severity: 'high', source: 'openai' })
  })

  it('grades a mid score as medium', async () => {
    mockModeration({ flagged: true, category_scores: { harassment: 0.6 } })
    const v = await moderateText('borderline content', 'recipe.description')
    expect(v).toMatchObject({ allowed: false, severity: 'medium', source: 'openai' })
  })

  it('grades a low score as clean', async () => {
    mockModeration({ flagged: false, category_scores: { harassment: 0.01 } })
    const v = await moderateText('a wholesome lasagna recipe', 'recipe.description')
    expect(v).toMatchObject({ allowed: true, severity: 'clean', source: 'openai' })
  })

  it('treats sexual/minors as high regardless of score', async () => {
    mockModeration({ flagged: true, categories: { 'sexual/minors': true }, category_scores: { 'sexual/minors': 0.2 } })
    const v = await moderateText('borderline content', 'review')
    expect(v).toMatchObject({ severity: 'high', category: 'sexual/minors' })
  })

  it('respects env-tuned thresholds', async () => {
    process.env.MODERATION_HIGH_THRESHOLD = '0.5'
    mockModeration({ flagged: true, category_scores: { hate: 0.55 } })
    const v = await moderateText('borderline content', 'review')
    expect(v.severity).toBe('high')
  })

  it('flagged with no usable category scores → medium with a non-null reason', async () => {
    mockModeration({ flagged: true, category_scores: {} })
    const v = await moderateText('borderline content', 'recipe.description')
    expect(v.severity).toBe('medium')
    expect(v.category).toBe('flagged')
    // Never the meaningless 'openai:null:0.00'.
    expect(v.reason).toBe('openai:flagged:0.00')
  })
})

describe('moderateText — fail-open', () => {
  it('returns clean (failing open) when the API call rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const v = await moderateText('a perfectly normal sentence', 'review')
    expect(v).toMatchObject({ allowed: true, severity: 'clean', source: 'error' })
  })

  it('returns clean (failing open) on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const v = await moderateText('a perfectly normal sentence', 'review')
    expect(v).toMatchObject({ allowed: true, severity: 'clean', source: 'error' })
  })
})
