/**
 * writeLimiter wiring — proves each moderated write route actually mounts its
 * per-surface limiter, in the right order.
 *
 * The limiters `skip` under NODE_ENV=test, so a supertest request can never
 * produce a real 429 here. Instead we inspect the routers' middleware stacks by
 * REFERENCE: each route file imports the same singleton limiter we import below,
 * so the exact function must appear in the route's handler chain, after
 * verifyToken + requireActive (a limiter keyed on req.uid is meaningless before
 * verifyToken populates it, and we only want to spend the budget on requests
 * from active accounts). This is what catches a future route being added — or an
 * existing one reordered — without its limiter.
 */

const { verifyToken, requireActive } = require('../middleware/auth')
const {
  recipeWriteLimiter,
  reviewWriteLimiter,
  profileWriteLimiter,
  collectionWriteLimiter,
  draftWriteLimiter,
} = require('../middleware/writeLimiter')

const recipesRouter = require('../routes/recipes')
const reviewsRouter = require('../routes/reviews')
const authRouter = require('../routes/auth')
const ingredientsRouter = require('../routes/ingredients')
const gamificationRouter = require('../routes/gamification')
const reportsRouter = require('../routes/reports')
const collectionsRouter = require('../routes/collections')
const draftsRouter = require('../routes/drafts')

// Ordered handler chain for a single route on a router, or throws if missing.
const routeHandlers = (router, method, path) => {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  )
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} not found`)
  return layer.route.stack.map((s) => s.handle)
}

// Structurally identify ANY express-rate-limit middleware — including a limiter
// instance a route file never exports. `rateLimit()` (used by every limiter in
// middleware/writeLimiter.js and the per-route parseLimiter/reportLimiter) attaches
// `getKey` and `resetKey` function properties to the returned middleware; a plain
// route handler or auth middleware has neither. This lets the pins below assert
// "is / is not a limiter" without needing a reference to the specific singleton, so
// a brand-new, not-yet-exported limiter added to a route can't slip past them.
const isRateLimiter = (handler) =>
  typeof handler === 'function' &&
  typeof handler.getKey === 'function' &&
  typeof handler.resetKey === 'function'

describe('per-surface write limiters are wired onto every moderated write route', () => {
  const cases = [
    ['recipes', recipesRouter, 'post', '/addRecipe', recipeWriteLimiter],
    ['recipes', recipesRouter, 'put', '/editRecipe', recipeWriteLimiter],
    ['reviews', reviewsRouter, 'post', '/newReview', reviewWriteLimiter],
    ['reviews', reviewsRouter, 'post', '/editReview', reviewWriteLimiter],
    ['auth', authRouter, 'post', '/setUsername', profileWriteLimiter],
    ['auth', authRouter, 'post', '/updateProfile', profileWriteLimiter],
    ['auth', authRouter, 'post', '/updatePhoto', profileWriteLimiter],
    ['auth', authRouter, 'post', '/updateDisplayName', profileWriteLimiter],
    ['auth', authRouter, 'post', '/updatePrivacy', profileWriteLimiter],
    ['collections', collectionsRouter, 'post', '/collections', collectionWriteLimiter],
    ['collections', collectionsRouter, 'patch', '/collections/:id', collectionWriteLimiter],
    ['drafts', draftsRouter, 'post', '/', draftWriteLimiter],
  ]

  it.each(cases)(
    '%s %s %s mounts its limiter after verifyToken + requireActive',
    (_group, router, method, path, limiter) => {
      const handlers = routeHandlers(router, method, path)
      expect(handlers).toContain(verifyToken)
      expect(handlers).toContain(requireActive)
      expect(handlers).toContain(limiter)
      // verifyToken → requireActive → limiter, in that order.
      expect(handlers.indexOf(verifyToken)).toBeLessThan(handlers.indexOf(requireActive))
      expect(handlers.indexOf(requireActive)).toBeLessThan(handlers.indexOf(limiter))
    }
  )

  it('recipe / review / profile / collection / draft each use a DISTINCT limiter instance', () => {
    // Independent instances ⇒ independent buckets (the #3 fix). If two surfaces
    // ever collapsed back onto one shared limiter this would catch it.
    const limiters = new Set([
      recipeWriteLimiter,
      reviewWriteLimiter,
      profileWriteLimiter,
      collectionWriteLimiter,
      draftWriteLimiter,
    ])
    expect(limiters.size).toBe(5)
  })

  it('PUT /drafts/:id (autosave) is NOT wired to draftWriteLimiter or ANY rate-limiter', () => {
    // The autosave path is deliberately unlimited (see the comment at that route's
    // mount point in drafts.js). Two layers of assertion:
    //   1. none of the KNOWN per-surface limiter instances appear, and
    //   2. structurally, NO handler in the chain is a rate-limiter at all — so a
    //      brand-new limiter instance added to this route (which the instance
    //      checks alone would miss, since they only know the 5 exported singletons)
    //      still fails this pin.
    const handlers = routeHandlers(draftsRouter, 'put', '/:id')
    const allLimiters = [
      recipeWriteLimiter,
      reviewWriteLimiter,
      profileWriteLimiter,
      collectionWriteLimiter,
      draftWriteLimiter,
    ]
    allLimiters.forEach((limiter) => expect(handlers).not.toContain(limiter))
    expect(handlers.some(isRateLimiter)).toBe(false)
  })

  it('collections POST /collections and PATCH /collections/:id SHARE one limiter instance', () => {
    // Unlike the recipe/review/profile surfaces (one bucket per surface), create
    // and rename intentionally draw from the SAME collectionWriteLimiter bucket —
    // they're the same class of write (a user-supplied name, same validation).
    const createHandlers = routeHandlers(collectionsRouter, 'post', '/collections')
    const renameHandlers = routeHandlers(collectionsRouter, 'patch', '/collections/:id')
    expect(createHandlers).toContain(collectionWriteLimiter)
    expect(renameHandlers).toContain(collectionWriteLimiter)
  })

  it('ingredients POST /parse mounts requireActive + a user limiter + the daily paid-quota limiter after verifyToken', () => {
    // parseLimiter + the paid-quota limiter are internal to the route file (not
    // exported), so assert structurally: verifyToken → requireActive → per-minute
    // limiter → daily paid-quota limiter → handler. requireActive gates paid
    // Spoonacular quota behind an active account; the paidQuotaLimiter adds the
    // per-account + global DAILY ceiling (audit H1), matching the write-surface order.
    const handlers = routeHandlers(ingredientsRouter, 'post', '/parse')
    expect(handlers[0]).toBe(verifyToken)
    expect(handlers[1]).toBe(requireActive)
    expect(handlers).toHaveLength(5) // verifyToken, requireActive, parseLimiter, paidQuotaLimiter, handler
    // The 3rd handler is the unexported per-user parseLimiter — identify it
    // structurally rather than by reference.
    expect(isRateLimiter(handlers[2])).toBe(true)
    // The 4th is the daily paid-quota limiter (audit H1), named for structural id.
    expect(handlers[3].name).toBe('paidQuotaLimiter')
  })

  it('gamification POST /acknowledgeAchievements mounts requireActive + profileWriteLimiter after verifyToken', () => {
    // A userProfiles write that shares the profile budget. requireActive was added
    // (audit L1) so a suspended/banned account can't keep mutating gamification
    // state: assert verifyToken → requireActive → limiter.
    const handlers = routeHandlers(gamificationRouter, 'post', '/acknowledgeAchievements')
    expect(handlers[0]).toBe(verifyToken)
    expect(handlers[1]).toBe(requireActive)
    expect(handlers).toContain(profileWriteLimiter)
    expect(handlers.indexOf(requireActive)).toBeLessThan(handlers.indexOf(profileWriteLimiter))
  })

  it('reports POST /reports mounts a breadth limiter after verifyToken + requireActive', () => {
    // reportLimiter is internal to the route file (not exported), so assert
    // structurally: verifyToken → requireActive → (limiter) → handler.
    const handlers = routeHandlers(reportsRouter, 'post', '/reports')
    expect(handlers[0]).toBe(verifyToken)
    expect(handlers[1]).toBe(requireActive)
    expect(handlers).toHaveLength(4) // verifyToken, requireActive, reportLimiter, handler
  })
})

// Same reference-identity pattern for the suspended/banned gate: the 403 behavior
// is exercised end-to-end on a few surfaces (user-status-enforcement.test.js);
// this pins that the remaining blocked-user write surfaces actually mount
// requireActive, after verifyToken (it reads req.uid).
describe('requireActive is wired onto every blocked-user write surface', () => {
  const cases = [
    ['collections', collectionsRouter, 'post', '/collections'],
    ['collections', collectionsRouter, 'patch', '/collections/:id'],
    ['collections', collectionsRouter, 'delete', '/collections/:id'],
    ['collections', collectionsRouter, 'patch', '/recipes/:recipeId/collections'],
    ['drafts', draftsRouter, 'post', '/'],
    ['drafts', draftsRouter, 'put', '/:id'],
    ['recipes', recipesRouter, 'post', '/recipes/:id/save'],
    ['recipes', recipesRouter, 'delete', '/recipes/:id/save'],
    ['recipes', recipesRouter, 'post', '/madeRecipe'],
    ['ingredients', ingredientsRouter, 'post', '/parse'],
  ]

  it.each(cases)(
    '%s %s %s mounts requireActive after verifyToken',
    (_group, router, method, path) => {
      const handlers = routeHandlers(router, method, path)
      expect(handlers).toContain(verifyToken)
      expect(handlers).toContain(requireActive)
      expect(handlers.indexOf(verifyToken)).toBeLessThan(handlers.indexOf(requireActive))
    }
  )
})
