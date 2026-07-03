// In-process TTL cache for GET /recipes/facets.
//
// The endpoint answers with the distinct cuisine / nutritionLabels / mealTypes
// values present in the catalog so the browse UI can gray out filter chips that
// would match zero recipes. Each distinct() is an unavoidable COLLSCAN — a
// distinct with no predicate has to examine every recipe doc (verified via
// explain: winningPlan stage COLLSCAN, totalDocsExamined = collection size,
// totalKeysExamined 0, no index possible) — and the route ran three of them on
// every /recipes page load.
//
// Facets are read-mostly and highly staleness-tolerant: the browse page already
// caches this response for 10 minutes (React Query staleTime) and only uses it
// to hide empty filter chips. So a short server-side TTL cache is safe and
// collapses the three scans to at most one refresh per TTL window per process.
//
// Invalidation correctness — "a newly added recipe's cuisine/diet/mealType must
// surface in the filter UI":
//   - New VALUES only ever enter the catalog via addRecipe / editRecipe. Those
//     paths call invalidate() so the value is picked up on the very next load
//     rather than waiting out the TTL (immediate, not merely eventual).
//   - deleteRecipe also invalidates, so a removed value's chip drops on the next
//     load (the fresh recompute simply no longer sees it).
//   - The rare bulk removers (account-deletion cascade, admin status changes)
//     are left to the TTL backstop. A chip lingering for a cuisine that briefly
//     has no visible recipes is harmless and already possible today: the distinct
//     is unfiltered by status, so hidden/pending recipes already contribute chips.
//
// A single in-flight compute is shared, so a burst of cold-cache requests (e.g.
// right after a deploy or a cache bust) triggers one scan, not one per request.

const DEFAULT_TTL_MS = 5 * 60 * 1000

// `now` is injectable so tests can advance the clock deterministically without
// fake timers (which are fragile alongside supertest here — see __tests__/setup.js).
function createTTLCache({ ttlMs = DEFAULT_TTL_MS, now = Date.now } = {}) {
  let entry = null // { at: <ms>, value }
  let inflight = null // Promise resolving to the freshly computed value, or null
  // Bumped on every invalidate(). A compute that started before an invalidate
  // must not write its (now-stale) result into the cache, so it captures the
  // generation at the start and only commits if it still matches on resolve.
  let generation = 0

  async function get(compute) {
    if (entry && now() - entry.at < ttlMs) return entry.value
    if (inflight) return inflight
    const startGen = generation
    inflight = Promise.resolve()
      .then(compute)
      .then((value) => {
        // Skip caching if an invalidate() landed while this scan was running
        // (e.g. a recipe write committed after the scan read the collection).
        // The value is still returned to callers awaiting this compute; it just
        // doesn't poison the cache, so the next load recomputes fresh.
        if (generation === startGen) entry = { at: now(), value }
        return value
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function invalidate() {
    entry = null
    generation++
  }

  return { get, invalidate }
}

// The process-wide instance the /recipes/facets route and the recipe write
// paths share. Tests reset it via invalidate() in __tests__/setup.js.
const facetsCache = createTTLCache()

module.exports = { facetsCache, createTTLCache, DEFAULT_TTL_MS }
