// Curated zeroth-pass blocklist for text moderation.
//
// This runs BEFORE (and independently of) the OpenAI Moderation API, so it still
// catches the most blatant content when the classifier is disabled or down. It is
// deliberately small and high-precision: a blocklist hit is treated as
// high-confidence and FAIL-CLOSED (blocked even on API error), so false positives
// here are expensive. Broad / contextual judgement is left to the API layer.
//
// Two kinds of rule:
//   - `SLUR_TERMS`   — exact normalized-token matches (so "sh1t"/"f4g" obfuscation
//                      is caught) without the Scunthorpe problem of substring scans.
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

/**
 * Scan `text` for a blocklist hit. Returns the first match as
 * `{ term, kind }` (kind: 'slur' | 'spam'), or null when clean.
 *
 * @param {string} text
 * @param {string} [context]  field context, e.g. 'username' | 'recipe.title' | 'review'
 */
function checkBlocklist(text, context = '') {
  if (!text || typeof text !== 'string') return null

  for (const token of tokenize(text)) {
    if (SLUR_TERMS.has(normalizeToken(token))) {
      return { term: normalizeToken(token), kind: 'slur' }
    }
  }

  const isIdentity = IDENTITY_CONTEXTS.has(context)
  for (const { re, label, identityOnly } of SPAM_PATTERNS) {
    if (identityOnly && !isIdentity) continue
    if (re.test(text)) return { term: label, kind: 'spam' }
  }

  return null
}

module.exports = { checkBlocklist, normalizeToken, SLUR_TERMS, SPAM_PATTERNS }
