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

  it('recipe / review / profile each use a DISTINCT limiter instance', () => {
    // Independent instances ⇒ independent buckets (the #3 fix). If two surfaces
    // ever collapsed back onto one shared limiter this would catch it.
    const limiters = new Set([recipeWriteLimiter, reviewWriteLimiter, profileWriteLimiter])
    expect(limiters.size).toBe(3)
  })

  it('ingredients POST /parse mounts a user limiter right after verifyToken', () => {
    // parseLimiter is internal to the route file (not exported), so assert
    // structurally: verifyToken first, exactly one middleware before the handler.
    const handlers = routeHandlers(ingredientsRouter, 'post', '/parse')
    expect(handlers[0]).toBe(verifyToken)
    expect(handlers).toHaveLength(3) // verifyToken, parseLimiter, handler
  })

  it('gamification POST /acknowledgeAchievements mounts profileWriteLimiter after verifyToken', () => {
    // A userProfiles write that shares the profile budget. Unlike the profile
    // routes above it has no requireActive, so assert only verifyToken → limiter.
    const handlers = routeHandlers(gamificationRouter, 'post', '/acknowledgeAchievements')
    expect(handlers).toContain(verifyToken)
    expect(handlers).toContain(profileWriteLimiter)
    expect(handlers.indexOf(verifyToken)).toBeLessThan(handlers.indexOf(profileWriteLimiter))
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
