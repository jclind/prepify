// Client-side timeout/exit path for ingredient enrichment.
//
// RecipeAPI.getIngredientData soft-fails (it catches rejections and degrades to
// a parsed-only ingredient), but it can't protect against a request that never
// settles: the shared axios instance has no timeout, so a stalled server
// (e.g. a slow/"not found" Spoonacular lookup) leaves the promise pending
// forever and the add-recipe UI stuck on a loading row. This races the
// enrichment call against a wall clock so the UI always has an exit.
//
// Lives under src/pages/AddRecipe/* on purpose: the fix is scoped to the
// add-recipe flow rather than changing the global API client.

export const INGREDIENT_ENRICH_TIMEOUT_MS = 12_000

// Per-row enrichment state, keyed by ingredient id (not list index, so it
// survives reorders and concurrent adds): 'loading' while the nutrition/price
// lookup is in flight, 'error' when it failed or timed out. Rows absent from
// the map are settled. The map itself lives in useRecipeForm — the form owns it
// so submission can be gated while any row is still loading (a submit in that
// window would persist ingredientData:null and understate the serving price).
export type IngredientStatus = 'loading' | 'error'

// Pure update for the status map: `null` settles (removes) the entry, anything
// else upserts it. Returns the same reference when nothing changed so setState
// callers can skip a render.
export function withIngredientStatus(
  prev: Record<string, IngredientStatus>,
  id: string,
  status: IngredientStatus | null
): Record<string, IngredientStatus> {
  if (status === null) {
    if (!(id in prev)) return prev
    const next = { ...prev }
    delete next[id]
    return next
  }
  return { ...prev, [id]: status }
}

export class IngredientEnrichTimeoutError extends Error {
  constructor(ms: number) {
    super(`Ingredient enrichment timed out after ${ms}ms`)
    this.name = 'IngredientEnrichTimeoutError'
  }
}

// Resolves with the wrapped promise's value if it settles first; otherwise
// rejects with IngredientEnrichTimeoutError after `ms`. The timer is cleared as
// soon as the promise settles so a resolved request never leaves a dangling
// timeout. The underlying request is not aborted — it's simply abandoned — so a
// late response is harmless (the caller has already moved on).
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = INGREDIENT_ENRICH_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new IngredientEnrichTimeoutError(ms)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
