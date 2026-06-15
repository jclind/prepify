// Thin, swappable, env-gated text classifier — the single entry point every
// write route calls before persisting user text. Mirrors util/email.js:
//   - Reads config from the environment on every call (tests can toggle it).
//   - No-ops to a CLEAN verdict when no provider is configured, so local/CI runs
//     need no external key.
//
// Two layers, cheapest first:
//   1. Curated blocklist (util/moderationBlocklist) — always runs, even when the
//      API is disabled or down. A hit is HIGH severity and FAIL-CLOSED.
//   2. OpenAI Moderation API (free, purpose-built) — graded into high/medium/clean.
//      Transient failures FAIL-OPEN (logged, treated as clean) so a moderation
//      outage can't block all content creation.
//
// Returns a verdict the route interprets per surface:
//   { allowed, severity, reason, category, scores, source }
//     severity : 'clean' | 'medium' | 'high'
//     allowed  : true only when severity === 'clean'
//     source   : 'blocklist' | 'openai' | 'disabled' | 'error'

const { checkBlocklist } = require('./moderationBlocklist')

const MODERATION_URL = 'https://api.openai.com/v1/moderations'
const MODERATION_MODEL = 'omni-moderation-latest'
const REQUEST_TIMEOUT_MS = 5000

// Enabled only when a key is present AND not explicitly killed — same shape as
// email.js's emailEnabled(). Read live (not cached) so tests can flip it.
function moderationEnabled() {
  if (process.env.MODERATION_ENABLED === 'false') return false
  return !!process.env.OPENAI_API_KEY
}

// Score thresholds, env-overridable for tuning without a redeploy.
function highThreshold() {
  const v = parseFloat(process.env.MODERATION_HIGH_THRESHOLD)
  return Number.isFinite(v) ? v : 0.85
}
function mediumThreshold() {
  const v = parseFloat(process.env.MODERATION_MEDIUM_THRESHOLD)
  return Number.isFinite(v) ? v : 0.5
}

// Categories that are treated as HIGH the moment the API flags them at all,
// regardless of score — sexual content involving minors is never a "hold for
// review" judgement call. (`sexual/minors` is the omni-moderation category name.)
const ALWAYS_HIGH_CATEGORIES = new Set(['sexual/minors'])

const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, scores: null, source: 'disabled' }

// A clean verdict tagged with its source (so logs/tests can tell disabled from
// classifier-said-clean from failed-open).
function clean(source) {
  return { ...CLEAN, source }
}

// Map an OpenAI moderation result to our severity grade.
function grade(result) {
  const scores = result.category_scores || {}
  const categories = result.categories || {}

  for (const cat of ALWAYS_HIGH_CATEGORIES) {
    if (categories[cat]) {
      return { severity: 'high', category: cat, score: scores[cat] ?? 1 }
    }
  }

  let topCategory = null
  let topScore = 0
  for (const [cat, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score
      topCategory = cat
    }
  }

  if (topScore >= highThreshold()) return { severity: 'high', category: topCategory, score: topScore }
  if (result.flagged || topScore >= mediumThreshold()) {
    return { severity: 'medium', category: topCategory, score: topScore }
  }
  return { severity: 'clean', category: topCategory, score: topScore }
}

// Call the OpenAI Moderation endpoint with a hard timeout. Throws on network
// error, non-2xx, or timeout — the caller fails open on any throw.
async function callOpenAI(text) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODERATION_MODEL, input: text }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`OpenAI moderation HTTP ${res.status}`)
    const json = await res.json()
    const result = json?.results?.[0]
    if (!result) throw new Error('OpenAI moderation: empty result')
    return result
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Classify a piece of user text.
 *
 * @param {string} text       the content to screen
 * @param {string} [context]  field context ('username' | 'recipe.title' | 'review' | 'bio' | ...)
 * @returns {Promise<{allowed:boolean, severity:'clean'|'medium'|'high', reason:string|null, category:string|null, scores:object|null, source:string}>}
 */
async function moderateText(text, context = '') {
  if (!text || typeof text !== 'string' || !text.trim()) return clean('empty')

  // Layer 1 — blocklist. Runs unconditionally; fail-closed.
  const hit = checkBlocklist(text, context)
  if (hit) {
    return {
      allowed: false,
      severity: 'high',
      reason: `blocklist:${hit.kind}:${hit.term}`,
      category: hit.kind,
      scores: null,
      source: 'blocklist',
    }
  }

  // Layer 2 — OpenAI. Skipped (clean) when disabled.
  if (!moderationEnabled()) return clean('disabled')

  let result
  try {
    result = await callOpenAI(text)
  } catch (err) {
    // Fail-open on transient classifier errors: log and allow. An outage in the
    // moderation provider must not block all content creation.
    console.error(`moderateText: classifier error (failing open) [${context}]:`, err.message)
    return clean('error')
  }

  const { severity, category, score } = grade(result)
  return {
    allowed: severity === 'clean',
    severity,
    reason: severity === 'clean' ? null : `openai:${category}:${score.toFixed(2)}`,
    category,
    scores: result.category_scores || null,
    source: 'openai',
  }
}

module.exports = { moderateText, moderationEnabled, grade }
