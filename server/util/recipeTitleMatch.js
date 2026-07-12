/**
 * Fuzzy recipe-title matching for the autocomplete endpoint.
 *
 * The autocomplete query (`GET /searchAutoCompleteRecipes`) is a literal
 * case-insensitive substring match, so a single typo ("chikcen") returns
 * nothing. This module ranks candidate titles by approximate similarity so
 * near-misses still surface. It is intentionally scoped to the autocomplete
 * endpoint — it does not touch the main /recipes grid search.
 *
 * Scoring is conservative on purpose: the threshold is high enough that
 * unrelated titles ("Banana Bread" for a query of "apple") never leak in, so
 * adding the fuzzy fallback can only *add* genuine near-misses, never noise.
 */

const normalize = (s) =>
  String(s == null ? '' : s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

// Classic iterative Levenshtein edit distance (two-row DP).
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

// Similarity in [0, 1]: 1 = identical, 0 = nothing in common.
function ratio(a, b) {
  if (!a.length && !b.length) return 1
  const longest = Math.max(a.length, b.length)
  if (!longest) return 1
  return 1 - levenshtein(a, b) / longest
}

/**
 * How well `query` approximately appears in `title`, in [0, 1].
 * Considers: exact substring (1), per-word similarity, a sliding window across
 * the whole title (catches typos that straddle word boundaries), and — for
 * multi-word queries — the averaged best per-word match.
 */
function titleScore(query, title) {
  const q = normalize(query)
  const t = normalize(title)
  if (!q || !t) return 0
  if (t.includes(q)) return 1

  const qWords = q.split(' ').filter(Boolean)
  const tWords = t.split(' ').filter(Boolean)

  let best = 0

  // Whole-query vs each title word.
  for (const word of tWords) {
    if (word.startsWith(q) || q.startsWith(word)) best = Math.max(best, 0.9)
    best = Math.max(best, ratio(q, word))
    if (best === 1) return 1
  }

  // Sliding window over the full title for windows ~|q| long.
  const lo = Math.max(1, q.length - 1)
  const hi = q.length + 1
  for (let w = lo; w <= hi; w++) {
    for (let i = 0; i + w <= t.length; i++) {
      best = Math.max(best, ratio(q, t.substr(i, w)))
      if (best === 1) return 1
    }
  }

  // Multi-word query: average the best per-word match across title words.
  if (qWords.length > 1) {
    let sum = 0
    for (const qw of qWords) {
      let wordBest = 0
      for (const tw of tWords) {
        if (tw.includes(qw)) wordBest = Math.max(wordBest, 0.95)
        wordBest = Math.max(wordBest, ratio(qw, tw))
      }
      sum += wordBest
    }
    best = Math.max(best, sum / qWords.length)
  }

  return best
}

const FUZZY_THRESHOLD = 0.7

/**
 * Rank `candidates` (objects with a `title`) by fuzzy similarity to `query`,
 * keeping only those at/above `threshold`, sorted best-first, capped at `limit`.
 * Each returned object is the original candidate with a numeric `_score`.
 */
function fuzzyRankTitles(
  query,
  candidates,
  { threshold = FUZZY_THRESHOLD, limit = 8 } = {}
) {
  const q = normalize(query)
  if (!q) return []
  return candidates
    .map((c) => ({ ...c, _score: titleScore(q, c.title) }))
    .filter((c) => c._score >= threshold)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
}

/**
 * Build a MongoDB `$text` search string from a raw autocomplete query.
 *
 * `$text` gives `"…"` (phrase) and a leading `-` (term negation) operator
 * meaning, so a user typing them would silently change the query — a leading
 * `-apple` would EXCLUDE apple rather than search for it. Strip those operator
 * characters and normalize to a plain space-separated OR-of-terms over the
 * title text index. Returns '' when nothing searchable remains.
 */
function toTextSearch(query) {
  return normalize(query)
    .replace(/"/g, ' ') // no phrase mode
    .split(' ')
    .map((w) => w.replace(/^-+/, '')) // no per-term negation
    .filter(Boolean)
    .join(' ')
}

module.exports = {
  normalize,
  levenshtein,
  ratio,
  titleScore,
  fuzzyRankTitles,
  toTextSearch,
  FUZZY_THRESHOLD,
}
