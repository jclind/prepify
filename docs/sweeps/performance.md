# Performance sweep

> **Status:** Run 2026-06-26 (PR #198). Cheap wins shipped: image `loading`/`decoding` deferral on the Home
> cards, `RecipeCard` memo + `decoding`, trending `staleTime`. 6 structural follow-ups → BACKLOG (Tech debt):
> route code-splitting, missing Mongo indexes, `/recipes/facets` scans, recipe-page CLS pop-in, `AuthContext`
> memo, image `srcset`. Image `width`/`height` was trialled + reverted (doubled recipe CLS; boxes already
> CSS-reserved). *(See the [run log](README.md#run-log).)*

Full-coverage performance audit of the Prepify client + API: Lighthouse on the key pages, bundle
weight and code-splitting, image delivery, data-fetching waterfalls, and render cost. Knock out the
cheap wins; file the structural ones (code-splitting, indexes) to the backlog.

> Read [`README.md`](README.md) first — the shared method (worktree, run-prepify, fix-small/file-large,
> green gates) applies. This doc is the performance-specific brief.

## Kickoff

```
/worktree-create perf sweep — lighthouse, bundle, images, data-fetching

Read docs/sweeps/performance.md and docs/sweeps/README.md. Run the app (run-prepify skill) and do a
structured performance pass. Fix the cheap wins; file structural items to docs/BACKLOG.md (Tech debt).
Open a PR into development with before/after Lighthouse scores and a bundle-size note.
```

## The pass

1. **Lighthouse on the key pages, both form factors.** Home (`/`), Recipes browse (`/recipes`), a single
   recipe (`/recipes/:id`), and a logged-in Account page. **Run against a production preview, not the dev
   server** — `npm run build` then `npx vite preview --port <p> --outDir build`; dev bundles are unminified
   and score misleadingly low. Capture perf / a11y / best-practices / SEO for each. Use `--preset=desktop`
   and a mobile run. (`npx -y lighthouse@12 <url> --preset=desktop --only-categories=performance,...`.)
2. **Bundle size & code-splitting.** `npm run build` warns that the main chunk is >500 kB
   (`build/assets/index-*.js` ≈ 1.2 MB raw / ~390 kB gzip) — the whole app ships in one chunk with no
   route-level splitting. Investigate: route-level `React.lazy()` + `Suspense` for the heavy/rare routes
   (Admin/* , AddRecipe, EditRecipe, the chart/analytics views); audit heavy deps (firebase, the full
   `react-icons` sets, any chart lib). Visualize with `rollup-plugin-visualizer` or `source-map-explorer`.
   This is almost certainly a **backlog** item (needs `App.tsx` route changes + verification), not a blind fix.
3. **Images.** Recipe images come from Firebase Storage. Check: are they sized/compressed (WebP vs
   original JPEG/PNG), do `<img>`s carry width/height (or aspect-ratio) to avoid CLS, is `loading="lazy"`
   used below the fold (ingredient thumbs already are — verify cards, hero, avatars), and is the largest
   contentful image on Home/recipe pages reasonably sized for the slot? Cheap wins: add `loading`/dimensions;
   structural (a Storage resize pipeline / `srcset`) → backlog.
4. **Data-fetching & waterfalls.** Trace the network on Home and a recipe page. Look for: request
   waterfalls (sequential fetches that could parallelize), over-fetching (payloads with fields the page
   doesn't use), N+1 patterns (recipe → reviews → per-review user), and whether React Query caching is
   doing its job (`staleTime`, no duplicate keys — see `useNavMenu`'s `['username', uid]` pattern). The
   facets/trending/for-you endpoints (`server/routes/recipes.js`) are the heaviest — check their Mongo
   queries hit indexes.
5. **Server response times.** With the API on :4000/its worktree port, time the hot endpoints
   (`/api/recipes`, `/api/recipes/facets`, `/api/getTrendingRecipes`, `/api/getRecipe`). Slow ones usually
   mean a missing MongoDB index or a collection scan — confirm with `.explain()`. Index additions are a
   backend change → file with the query + the proposed index.
6. **Render cost.** Long lists (the recipes grid, the reviews list) — are rows memoized, is the list
   virtualized if it grows unbounded ("Load more" pagination already caps it)? Watch for unnecessary
   re-renders from context/provider churn (`AuthProvider`, React Query) and the local ingredient parser
   (`@jclind/ingredient-parser`) running on the main thread during Add Recipe.
7. **Delivery.** Confirm the host serves gzip/brotli + sensible cache headers for hashed assets, and that
   fonts don't block render (font-display, preconnect/preload for the brand font if self-hosted).

## Tooling & where to look

- `npm run build` (chunk warning), `npx vite preview` (prod-like serve), `npx -y lighthouse@12`.
- Headless: `.claude/skills/run-prepify/driver.mjs` (screenshots + console/network) — copy it to capture
  request timings (`page.on('request'/'response')`).
- Bundle: `rollup-plugin-visualizer` (Vite uses rolldown — `build.rolldownOptions`), or `source-map-explorer build/assets/*.js`.
- Backend: `server/routes/recipes.js`, `server/db.js` (pool `maxPoolSize: 10`), Mongo `.explain()`.

## Deliverable

A PR with: before/after Lighthouse table (Home + recipe, desktop+mobile), the current bundle size and a
recommendation, any cheap wins applied (image dims/lazy, meta), and backlog items for code-splitting +
any missing indexes. Don't claim a perf win you didn't measure.
