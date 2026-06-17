// Thin, swappable, env-gated IMAGE classifier — the image counterpart to
// util/textModeration. The same write routes that screen user text call this
// before publishing a user-supplied image URL. Mirrors textModeration/email.js:
//   - Reads config from the environment on every call (tests can toggle it).
//   - No-ops to a CLEAN verdict when no provider is configured, so local/CI runs
//     need no external key.
//
// Single layer: Google Cloud Vision SafeSearch (adult / violence / racy
// likelihoods), called over REST with native fetch (no SDK dep, matching the
// OpenAI choice in textModeration). The image is passed by its public Firebase
// download URL as `image.source.imageUri`, so we never download the bytes.
//
// DELIBERATE ASYMMETRY vs text: text moderation fails OPEN (a classifier outage
// must not block all content creation), but images fail CLOSED — an unscanned
// image is treated as MEDIUM ('unscanned'), so the caller quarantines it rather
// than publishing something never looked at. This is the spec's
// "quarantine-until-scanned" rule (docs/CONTENT_MODERATION.md).
//
// Returns the same verdict shape as moderateText, so the existing pipeline
// (respondBlocked / holdRecipeForReview) interprets it without translation:
//   { allowed, severity, reason, category, scores, source }
//     severity : 'clean' | 'medium' | 'high'
//     allowed  : true only when severity === 'clean'
//     source   : 'vision' | 'disabled' | 'error'

const { notifyInBackground, notifyAdultContentFlag } = require('./email')

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate'
const REQUEST_TIMEOUT_MS = 8000

// Google's SafeSearch likelihood enum, as an ordinal so thresholds compare
// numerically. UNKNOWN is treated as the floor (no signal).
const LIKELIHOOD = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5,
}

// Enabled only when a key is present AND not explicitly killed — same master
// toggle as textModeration (MODERATION_ENABLED gates every classifier). Read
// live (not cached) so tests can flip it.
function imageModerationEnabled() {
  if (process.env.MODERATION_ENABLED === 'false') return false
  return !!process.env.GOOGLE_VISION_API_KEY
}

// Likelihood thresholds, env-overridable for tuning without a redeploy. Named by
// the enum string (e.g. 'VERY_LIKELY'); fall back to a sane default if unset or
// not a recognized name.
function threshold(envName, fallback) {
  const v = process.env[envName]
  return v && v in LIKELIHOOD ? LIKELIHOOD[v] : LIKELIHOOD[fallback]
}
// adult/violence at this likelihood → HIGH (block); at the medium one → hold.
function highLikelihood() { return threshold('MODERATION_IMAGE_HIGH', 'VERY_LIKELY') }
function mediumLikelihood() { return threshold('MODERATION_IMAGE_MEDIUM', 'LIKELY') }

const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, score: null, scores: null, source: 'disabled' }
function clean(source) {
  return { ...CLEAN, source }
}

// Map a SafeSearch annotation to our severity grade. `adult` and `violence` can
// reach HIGH; `racy` (suggestive, not explicit) only ever contributes MEDIUM, so
// a merely-racy photo is held for a human rather than auto-blocked.
function grade(annotation = {}) {
  const score = (name) => LIKELIHOOD[annotation[name]] ?? 0
  const adult = score('adult')
  const violence = score('violence')
  const racy = score('racy')

  const high = highLikelihood()
  const medium = mediumLikelihood()

  // Pick the single most severe category for the verdict reason.
  let severity = 'clean'
  let category = null
  let topScore = 0

  for (const [cat, value] of [['adult', adult], ['violence', violence]]) {
    if (value >= high && severity !== 'high') { severity = 'high'; category = cat; topScore = value }
    else if (value >= medium && severity === 'clean') { severity = 'medium'; category = cat; topScore = value }
  }
  if (severity === 'clean' && racy >= LIKELIHOOD.VERY_LIKELY) {
    severity = 'medium'; category = 'racy'; topScore = racy
  }

  return { severity, category, score: topScore }
}

// Likelihood ordinal → its enum name, for a human-readable verdict reason.
function likelihoodName(ordinal) {
  return Object.keys(LIKELIHOOD).find((k) => LIKELIHOOD[k] === ordinal) || 'UNKNOWN'
}

// Call Vision SafeSearch with a hard timeout. Throws on network error, non-2xx,
// timeout, OR a per-image error in the response (e.g. Vision couldn't fetch/decode
// the URL) — the caller fails CLOSED on any throw.
async function callVision(imageUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${VISION_URL}?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        }],
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Vision SafeSearch HTTP ${res.status}`)
    const json = await res.json()
    const result = json?.responses?.[0]
    if (!result) throw new Error('Vision SafeSearch: empty result')
    // Vision reports a per-request failure (bad/unreachable image) in `error`
    // rather than a non-2xx — treat it as a scan failure so we fail closed.
    if (result.error) throw new Error(`Vision SafeSearch image error: ${result.error.message || result.error.code}`)
    // A 200 with no error but no annotation is anomalous (the feature was
    // requested). Treat a missing annotation as a scan failure so we fail CLOSED
    // rather than grading an empty object as clean and publishing it unscanned.
    if (!result.safeSearchAnnotation) throw new Error('Vision SafeSearch: missing annotation')
    return result.safeSearchAnnotation
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Classify a user-supplied image by URL.
 *
 * @param {string} imageUrl   public download URL of the image to screen
 * @param {string} [context]  surface context ('recipe.image' | 'profile.photo')
 * @returns {Promise<{allowed:boolean, severity:'clean'|'medium'|'high', reason:string|null, category:string|null, score:number|null, scores:object|null, source:string}>}
 *
 * `score` mirrors the text moderator's field for a uniform verdict shape, but is
 * always null here: Vision SafeSearch returns a coarse likelihood bucket
 * (UNLIKELY…VERY_LIKELY), not a 0–1 probability, so there's no honest numeric
 * confidence to surface. The bucket name lives in `reason` for human readers.
 */
async function moderateImage(imageUrl, context = '') {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) return clean('empty')
  if (!imageModerationEnabled()) return clean('disabled')

  let annotation
  try {
    annotation = await callVision(imageUrl)
  } catch (err) {
    // Fail CLOSED: an unscanned image is held (MEDIUM), never published. The
    // caller decides what "held" means for its surface — a recipe goes
    // pending_review; a profile photo is rejected (no owner-only state).
    console.error(`moderateImage: scan failed (failing closed) [${context}]:`, err.message)
    return { allowed: false, severity: 'medium', reason: 'vision:unscanned', category: 'unscanned', score: null, scores: null, source: 'error' }
  }

  const { severity, category, score } = grade(annotation)

  // Canary: surface any non-trivial ADULT signal in the logs even when the verdict
  // itself didn't hard-block (a POSSIBLE/LIKELY adult image still grades medium or
  // clean). The agreed trigger for standing up dedicated CSAM hash-scanning is "we
  // start seeing adult hits" — this is the early warning that bad actors found the
  // site. NOTE: SafeSearch flags generic adult/explicit content, NOT CSAM; this is
  // a signal to act, not a detector. See docs/CONTENT_MODERATION.md P3.
  if ((LIKELIHOOD[annotation.adult] ?? 0) >= LIKELIHOOD.LIKELY) {
    console.warn(
      `[moderation][adult-canary] adult=${annotation.adult} racy=${annotation.racy} ` +
      `violence=${annotation.violence} context=${context || 'n/a'} verdict=${severity} ` +
      `— review for abuse; if recurring, enable CSAM hash-scanning (CONTENT_MODERATION.md P3)`
    )
    // Push a throttled, best-effort alert email on top of the log (email.js gates
    // on RESEND_API_KEY and rate-limits itself; never awaited, never blocks the scan).
    notifyInBackground(
      notifyAdultContentFlag({
        context: context || 'n/a',
        adult: annotation.adult,
        racy: annotation.racy,
        violence: annotation.violence,
        verdict: severity,
      })
    )
  }

  return {
    allowed: severity === 'clean',
    severity,
    reason: severity === 'clean' ? null : `vision:${category}:${likelihoodName(score)}`,
    category,
    // Always null — Vision yields a likelihood bucket, not a 0–1 probability.
    score: null,
    scores: annotation,
    source: 'vision',
  }
}

module.exports = { moderateImage, imageModerationEnabled, grade }
