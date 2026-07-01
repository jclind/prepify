/// <reference types="cypress" />
import { API_URL } from '../support/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Visual-regression capture for the type-scale migration. DETECTION ONLY — this
// spec adds no app/style edits; it screenshots the running app and pixel-diffs
// the branch render against a `development` baseline (cypress-image-diff-js /
// pixelmatch).
//
// MANUAL tool — deliberately NOT in the default `cypress run` / CI suite. It
// lives under cypress/visual/ (outside the default cypress/e2e/** specPattern),
// so CI never runs it, and it needs a separate development baseline server +
// local baselines that don't exist in CI. Run it explicitly via its own config:
//
//   # 1. baseline pass — baseUrl -> the development test server; empty baseline
//   #    dir, so each compareSnapshot AUTO-CREATES a baseline and passes.
//   npx cypress run --config-file cypress.visual.config.ts \
//     --config baseUrl=http://localhost:3012
//   # 2. compare pass — baseUrl -> the branch test server; diffs against (1).
//   npx cypress run --config-file cypress.visual.config.ts \
//     --config baseUrl=http://localhost:3013
//
// One `it` PER (route, viewport) so a diff on one capture never skips another
// (compareSnapshot throws when a diff exceeds the threshold). Mocking mirrors
// the existing specs: full `${api()}/api/...` URLs from support/constants,
// fixtures for the route's key data, incidental calls pass through (same
// convention as browse/recipe.cy.ts). Both passes hit the same backend, so any
// incidental variance cancels.
//
// Determinism: remote photos neutralised (visibility:hidden — keep box, kill
// image variance); animations/transitions/caret killed; web font awaited; a
// tall viewport + capture:'viewport' avoids Cypress fullPage stitching (which
// duplicates the FIXED navbar). Public routes only — auth pages need
// cypress.env.json (absent here), so they're skipped, not silently dropped.
// ─────────────────────────────────────────────────────────────────────────────

const api = () => API_URL

const STABILIZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
  img { visibility: hidden !important; }
  [style*="background-image"] { background-image: none !important; }
  [class*="oaster"], [class*="oast-"] { display: none !important; }
`

function capture(name: string) {
  cy.document().then((doc) => {
    if (!doc.getElementById('vqa-stabilize')) {
      const s = doc.createElement('style')
      s.id = 'vqa-stabilize'
      s.innerHTML = STABILIZE_CSS
      doc.head.appendChild(s)
    }
  })
  cy.document().its('fonts.status').should('eq', 'loaded')
  cy.document().then((doc) => {
    const el = doc.activeElement as HTMLElement | null
    if (el && typeof el.blur === 'function') el.blur()
  })
  cy.compareSnapshot({ name, cypressScreenshotOptions: { capture: 'viewport' } })
}

// Desktop + mobile ($bp-xs = 375). Tall heights so the page fits one viewport
// capture (no fullPage stitching).
const VIEWPORTS = {
  desktop: { w: 1280, h: 3000 },
  mobile: { w: 375, h: 4500 },
} as const
// Taller pages (single recipe, about) get extra height.
const VIEWPORTS_TALL = {
  desktop: { w: 1280, h: 3400 },
  mobile: { w: 375, h: 5400 },
} as const

type RouteCfg = {
  key: string
  path: () => string
  anchor: string
  viewports: typeof VIEWPORTS
  visitOpts?: Partial<Cypress.VisitOptions>
  stub: () => void
  note?: string
}

let recipeId = ''

const ROUTES: RouteCfg[] = [
  {
    key: 'home',
    path: () => '/',
    // Loaded trending cards are <a.home-recipe-card>; skeletons are <div> with
    // the same class — anchor on the anchor tag to wait past the skeleton.
    anchor: 'a.home-recipe-card',
    viewports: VIEWPORTS,
    stub: () => {
      cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
    },
  },
  {
    key: 'recipes',
    path: () => '/recipes',
    anchor: '.recipe-card',
    viewports: VIEWPORTS,
    stub: () => {
      cy.intercept('GET', `${api()}/api/getTrendingRecipes*`, { fixture: 'trending-recipes.json' })
      cy.intercept('GET', `${api()}/api/recipes*`, { fixture: 'recipes.json' })
      cy.intercept('GET', `${api()}/api/searchAutoCompleteRecipes*`, {
        fixture: 'search-auto-complete-recipes.json',
      })
    },
  },
  {
    key: 'recipe',
    path: () => `/recipes/${recipeId}`,
    anchor: '.ing', // ingredients present => recipe body fully rendered
    viewports: VIEWPORTS_TALL,
    note: 'densest — 49 migrations',
    stub: () => {
      cy.intercept('GET', `${api()}/api/getRecipe*`, { fixture: 'single-recipe.json' })
      cy.intercept('GET', `${api()}/api/getReviews*`, { fixture: 'recipe-reviews.json' })
      cy.intercept('GET', `${api()}/api/checkIfReviewed*`, { body: null })
      cy.intercept('GET', `${api()}/api/getUsername*`, { body: null })
      cy.intercept('GET', `${api()}/api/getSavedRecipe*`, { body: [] })
    },
  },
  {
    key: 'profile',
    path: () => '/u/baduser',
    anchor: '.pp-counts, .pp-bio, .pp-avatar',
    viewports: VIEWPORTS,
    stub: () => {
      cy.intercept('GET', `${api()}/api/getPublicProfile*`, { fixture: 'public-profile.json' })
      cy.intercept('GET', `${api()}/api/getUsername*`, { body: null })
    },
  },
  {
    // NOTE: About's clamp() hero headings are out-of-scope, but the rest of the
    // page's text WAS migrated — a nonzero diff here is expected.
    key: 'about',
    path: () => '/about',
    anchor: '.about-card',
    viewports: VIEWPORTS_TALL,
    stub: () => {},
  },
  {
    // NOTE: the giant 404 numerals are out-of-scope; the surrounding copy was
    // migrated, so a small diff is expected.
    key: 'notfound',
    path: () => '/no-such-page-xyz',
    anchor: '.not-found-page',
    viewports: VIEWPORTS,
    visitOpts: { failOnStatusCode: false },
    stub: () => {},
  },
]

before(() => {
  cy.fixture('single-recipe.json').then((r) => {
    recipeId = r._id
  })
})

ROUTES.forEach((route) => {
  describe(`type-scale: ${route.key}${route.note ? ` (${route.note})` : ''}`, () => {
    beforeEach(() => route.stub())
    ;(Object.keys(route.viewports) as Array<keyof typeof VIEWPORTS>).forEach((vp) => {
      it(`${route.key}-${vp}`, () => {
        const v = route.viewports[vp]
        cy.viewport(v.w, v.h)
        cy.visit(route.path(), route.visitOpts)
        cy.get(route.anchor, { timeout: 15000 }).should('be.visible')
        capture(`${route.key}-${vp}`)
      })
    })
  })
})
