// Curated zeroth-pass blocklist for text moderation.
//
// This runs BEFORE (and independently of) the OpenAI Moderation API, so it still
// catches the most blatant content when the classifier is disabled or down. It is
// deliberately small and high-precision: a blocklist hit is treated as
// high-confidence and FAIL-CLOSED (blocked even on API error), so false positives
// here are expensive. Broad / contextual judgement is left to the API layer.
//
// Two kinds of rule:
//   - `SLUR_TERMS`   — normalized slur stems. Matched as exact tokens on every
//                      surface (so "sh1t"/"f4g" obfuscation is caught), plus two
//                      hardening passes that defeat the common evasions of an
//                      exact-token list:
//                        1. letter-spacing ("s h i t", "n.i.g.g.e.r") — runs of
//                           single-character tokens are rejoined and re-scanned;
//                        2. concatenation/embedding ("shitfuck", "niggerlover") —
//                           a substring scan, applied carefully to avoid the
//                           Scunthorpe problem (see SUBSTRING_SLURS / BENIGN_ALLOWLIST
//                           and the per-surface strictness below).
//   - `SPAM_PATTERNS` — regexes for promotional / link-dropping abuse. Some only
//                      apply to short identity fields (username/displayName), where
//                      a URL or "buy now" is never legitimate.
//
// Extend the lists in place; the matching logic below should not need to change.

// Normalize a single token for slur matching: lowercase, fold common leetspeak,
// collapse 3+ repeated chars to one, and drop anything non-alphanumeric. This
// makes "F.U.C.K", "fuuuck", and "f4ck" all normalize to the same stem.
const LEET_MAP = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' }

function normalizeToken(token) {
  return String(token)
    .toLowerCase()
    .replace(/[01345 7@$]/g, (c) => LEET_MAP[c] || c)
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/[^a-z0-9]/g, '')
}

// Split arbitrary text into candidate tokens on any non-alphanumeric run.
function tokenize(text) {
  return String(text).split(/[^a-zA-Z0-9@$]+/).filter(Boolean)
}

// Slur stems, stored already-normalized. Keep this list tight and obvious; the
// API layer handles the long tail and anything context-dependent. (Starter set —
// extend with the product's policy list.)
const SLUR_TERMS = new Set(
  [
    'fuck',
    'shit',
    'bitch',
    'cunt',
    'asshole',
    'nigger',
    'faggot',
    'retard',
    'whore',
    'slut',
  ].map(normalizeToken)
)

// Subset of SLUR_TERMS that is safe to match as a SUBSTRING on ANY surface
// (including long-form prose like recipes/reviews/bios). These stems effectively
// never occur inside benign English or food words, so "niggerlover" / "xcunt" /
// "megaasshole" are caught everywhere. The few real-world collisions (e.g. the
// place name "Scunthorpe") are handled by BENIGN_ALLOWLIST below.
//
// The REMAINING slur stems (shit, fuck, bitch, faggot, …) are substring-prone —
// "shitake" (a misspelled mushroom), the British food "faggots", "fire retardant"
// — so they are only substring-matched on short identity fields (username /
// displayName), where there is no legitimate prose to false-positive on. On
// long-form surfaces they still match as exact tokens, and the OpenAI layer is the
// semantic backstop for obfuscated profanity there.
const SUBSTRING_SLURS = new Set(['nigger', 'cunt', 'asshole'].map(normalizeToken))

// Benign words that CONTAIN a slur stem as a substring and must never trip the
// substring scan (the "Scunthorpe problem"). Stored already-normalized. Matched as
// a whole normalized token, so a token equal to one of these is exempt from the
// substring pass entirely (it is still subject to exact-token matching, which none
// of these collide with). Keep this list tight and obvious.
const BENIGN_ALLOWLIST = new Set(
  [
    'scunthorpe', // place name — contains "cunt"
    'shiitake', // mushroom — (doesn't actually contain "shit", but pin it)
    'shitake', // common misspelling of the mushroom — contains "shit"
    'shitzu', // common misspelling of "shih tzu" — contains "shit"
    'retardant', // e.g. fire retardant — contains "retard"
    'niggardly', // archaic "stingy" — contains "niggar" (not "nigger"), pinned for safety
  ].map(normalizeToken)
)

// Spam / promotional patterns. `identityOnly: true` rules apply only to short
// identity fields (username, displayName) where any URL or call-to-action is abuse;
// they are NOT applied to recipe bodies or reviews, which legitimately contain
// links and prose.
const SPAM_PATTERNS = [
  { re: /\bhttps?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/i, label: 'url', identityOnly: true },
  { re: /[a-z0-9-]+\.(com|net|org|io|ru|xyz|shop)\b/i, label: 'domain', identityOnly: true },
  { re: /\b(buy|order|shop)\s+now\b/i, label: 'buy-now', identityOnly: false },
  { re: /\b(free|cheap)\s+(viagra|cialis|crypto|bitcoin|followers)\b/i, label: 'spam-offer', identityOnly: false },
]

// Short identity fields get the stricter (identityOnly) spam rules too: a URL or
// bare domain in a username/displayName is never legitimate.
//
// `bio`/`location` (context 'profile') are DELIBERATELY excluded. A bio is prose,
// and a recipe author linking their own blog/socials is legitimate, so blocking
// every URL there would be user-hostile. Bios are still covered by the
// non-identity spam patterns (promotional "buy now" / "free crypto" phrasing) and
// by the OpenAI layer. If bio link-spam becomes a real problem, add 'profile'
// here — that's the single switch that makes bios reject URLs/domains too.
const IDENTITY_CONTEXTS = new Set(['username', 'displayName'])

// Match a single already-normalized token against the slur list, returning the
// matched stem or null. Matching tiers, cheapest first:
//   1. allowlisted benign word  -> never a slur,
//   2. exact normalized token   -> slur (any surface),
//   3. substring contains a stem -> slur, but only if the stem is in
//      SUBSTRING_SLURS (safe everywhere) OR the field is a short identity field
//      (`wide`), where soft/substring-prone stems are also checked.
function matchSlurToken(normalized, wide) {
  if (!normalized || BENIGN_ALLOWLIST.has(normalized)) return null
  if (SLUR_TERMS.has(normalized)) return normalized
  for (const term of SLUR_TERMS) {
    if (normalized.includes(term) && (wide || SUBSTRING_SLURS.has(term))) return term
  }
  return null
}

// Join maximal runs of single-character tokens so letter-spacing ("s h i t",
// "n.i.g.g.e.r", "f*u*c*k") collapses back into one token to scan. A deliberately
// letter-spaced string is itself an adversarial signal, so the joined run is
// scanned with the wide (identity-strength) pass.
function spacedRuns(tokens) {
  const runs = []
  let run = []
  for (const t of tokens) {
    if (t.length === 1) run.push(t)
    else {
      if (run.length > 1) runs.push(run.join(''))
      run = []
    }
  }
  if (run.length > 1) runs.push(run.join(''))
  return runs
}

/**
 * Scan `text` for a blocklist hit. Returns the first match as
 * `{ term, kind }` (kind: 'slur' | 'spam'), or null when clean.
 *
 * @param {string} text
 * @param {string} [context]  field context, e.g. 'username' | 'recipe.title' | 'review'
 */
function checkBlocklist(text, context = '') {
  if (!text || typeof text !== 'string') return null

  const isIdentity = IDENTITY_CONTEXTS.has(context)
  const tokens = tokenize(text)

  // Per-token pass: exact on every surface, substring per the tier rules above.
  for (const token of tokens) {
    const hit = matchSlurToken(normalizeToken(token), isIdentity)
    if (hit) return { term: hit, kind: 'slur' }
  }

  // Letter-spacing pass: rejoin runs of single-character tokens and re-scan.
  for (const run of spacedRuns(tokens)) {
    const hit = matchSlurToken(normalizeToken(run), true)
    if (hit) return { term: hit, kind: 'slur' }
  }

  for (const { re, label, identityOnly } of SPAM_PATTERNS) {
    if (identityOnly && !isIdentity) continue
    if (re.test(text)) return { term: label, kind: 'spam' }
  }

  return null
}

module.exports = {
  checkBlocklist,
  normalizeToken,
  SLUR_TERMS,
  SUBSTRING_SLURS,
  BENIGN_ALLOWLIST,
  SPAM_PATTERNS,
}
