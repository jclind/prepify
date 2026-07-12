# §D Ratings & Reviews Overhaul — Scope

*Drafted 2026-07-08. Source spec: `RELEASE_PLAN.md:331-346` ("Ratings & Reviews area overhaul", **release blocker**). This document turns that item + its two fold-ins into an executable plan: workstreams, PR sequencing, decisions needed, and what can be delegated to a lower-cost model session.*

---

## 1. Mandate (what §D actually requires)

From `RELEASE_PLAN.md:331-346`:

1. **Redesign the ratings + reviews UI end-to-end** on the single-recipe page — the rating
   summary/breakdown, the "your review" card vs the public list, the add/edit/delete flow, and
   empty/loading states. The 2026-06-29 pill `.btn` sweep restyled the buttons but not the
   layout/UX — the layout/UX *is* this item.
2. **Fold-in A — reviewer avatars** (`BACKLOG.md:645-652`): review cards show only
   `@username`/stars/date; `/getReviews` carries no photo. Batch-resolve deduped reviewer uids via
   `getAuth().getUsers()` (tolerating failures like `publicProfile.js:34-47`) and fall back to
   `DefaultAvatar`.
3. **Fold-in B — reviewer-name → `/u/:username` link** (`BACKLOG.md:161-168`, roadmap rule 8b):
   N4 (#258) shipped the author-byline half; the reviewer-name half was deliberately deferred here
   because §D rewrites `RecipeReview.tsx` end-to-end.
4. `server/routes/reviews.js` may change **if the data shape changes** (it does — avatars).

**Why it's a blocker:** owner wants this area looking right before dropping the beta label.

### Explicitly OUT of scope (adjacent items that share surface — flag, don't act)

| Item | Where it's tracked | Why out |
|---|---|---|
| "Helpful (n)" review votes | `FEATURE_IDEAS.md:44` | Needs new API + product decision; post-1.0 |
| "Made it!" photo reviews | `FEATURE_IDEAS.md:61` | New feature, not a redesign |
| Avatar customizer | `BACKLOG_ROADMAP.md:223-225` | Post-1.0 personalization |
| Data-integrity pass (key `ratings` by `userId`, cascade deletes, transactions) | `RELEASE_PLAN.md:373-383`, `DATA_INTEGRITY_AUDIT.md` | Separate post-1.0 item; §D must not quietly absorb it even though both touch `reviews.js` |
| Account-page **UserRatings** tab redesign | file to BACKLOG | Outside the §D file surface (`src/pages/Account/UserRatings/`); its `filter='newAdd'` dead-sort bug should be filed as its own backlog line |

---

## 2. Current state (condensed; full map in §7 appendix)

- **One Mongo collection, `ratings`** — a single doc per (user, recipe) holds both the star rating
  and optional review text. Unique partial index on `{userId, recipeId}`. No separate reviews
  collection; "review" = a ratings doc with non-empty `reviewText`.
- **Server** `server/routes/reviews.js`: `POST /addRating`, `POST /newReview`,
  `GET /checkIfReviewed`, `POST /editReview`, `DELETE /deleteReview`, `DELETE /removeRating`,
  `GET /getReviews` (optionalAuth, paginated, `isCurrentUser` derived from verified uid),
  `GET /getSingleUserReviews` (public), `PATCH /admin/reviews/moderation`. Aggregate
  `{rateCount, rateValue}` recomputed onto the recipe doc by
  `server/util/recipeRating.js` on rating-affecting writes.
- **Client API**: all methods live on the `RecipeAPI` singleton (`src/api/recipes.ts:435-490`).
- **UI**: `src/pages/SingleRecipe/DataSections/RatingsAndReviews/` — container, `Ratings` card
  (interactive stars, optimistic add/remove), `Reviews/` (`ReviewsContainer` with load-more
  accumulation, `ReviewsList`, `RecipeReview`, `AddReview`, `ReviewOptions`,
  `EditingReviewOptions`, `ConfirmDeleteReviewModal`, `ReviewCardSkeleton`) + per-component SCSS.
  Shared `src/Components/StarRating/StarRating.tsx` (inline styles, no SCSS).
- **Types**: `ReviewType` / `OptionalReviewType` / `NewReviewType` in `src/types.ts:214-240`
  (rating typed `string` though the server writes `number | null`; no `userId`/`isCurrentUser`/photo).
- **Tests**: thorough server Jest suite (`server/__tests__/reviews.test.js`,
  `recipeRating.test.js`) and four Vitest suites; Cypress stubs `getReviews`/`checkIfReviewed`
  via `cypress/fixtures/recipe-reviews.json`.

### Defects inside the §D surface (fix as part of the overhaul)

These live in files §D rewrites anyway, so they're in scope — not flag-don't-act:

1. **`editReview` sends the review text unencoded in the query string**
   (`src/api/recipes.ts:456-458`) — text containing `&`, `#`, `%`, `+` is truncated/corrupted.
   Fix by moving `text` to a JSON body (matching `newReview`), server accepting body with a
   temporary query fallback during the two-PR transition.
2. **`ReviewsContainer` client-side re-filters `r.reviewText`** even though the server already
   excludes empty reviews — redundant and it can desync `isMoreReviews`/`totalCount` math.
3. **`RecipeReview` wraps `StarRating` in a bespoke error boundary** instead of validating data —
   remove once the type is honest.
4. **`ReviewType.rating` typed `string`, actually `number | null`** — retype and delete the
   scattered `Number(...)` wraps (guard the `null` → "NaN" render path in consumers).
5. **Dead `username` query param** sent by `getReviews` client call — drop it.
6. **Star widget a11y**: interactive mode is 5 unrelated buttons — no radiogroup semantics, no
   arrow keys, hover preview and "remove" state unannounced; hardcoded `#ff5722`/`#cccccc` not on
   design tokens.
7. **No client max-length feedback** on review textarea (server caps at
   `DESCRIPTION_MAX_LENGTH` = 2000; client only enforces ≥5) — add a live counter near the limit.

Server-side timestamp inconsistencies (`ratingLastUpdated` mixed Date/string; epoch-millis-as-string
sorts) are **data-shape territory shared with the post-1.0 data-integrity item** — leave writes as-is
and file a note there, unless PR-A trivially normalizes new writes without a backfill.

---

## 3. Workstreams

### WS-1 · Server: enriched `/getReviews` payload — **PR-A** (server-only)

- Add `photoURL: string | null` **and `displayName: string | null`** (Q4: yes) to each review
  returned by `GET /getReviews`: dedupe the page's `userId`s → one `getAuth().getUsers()` batch
  (≤50/page, under the 100-identifier limit) → map back; tolerate lookup failures per the
  `publicProfile.js:34-47` pattern (null fields, never fail the request). `DefaultAvatar` fallback
  stays client-side.
- **Rating breakdown (Q1: in):** extend
  `computeRecipeRating`/`recomputeRecipeRating` to also persist per-star counts on the recipe doc
  (`rating: { rateCount, rateValue, breakdown: {1..5} }`). Recompute already reads every rating doc
  on each rating write, so this is near-free at write time and zero-cost at read time; add a one-off
  backfill via the existing `reconcileRatingAggregates.js` script pattern. Seed shape on recipe
  create (`server/routes/recipes.js:550`).
- `POST /editReview`: accept `{ recipeId, text }` JSON body (keep query fallback one release).
- Conventions that bind: `asyncHandler` + throw, middleware order, `reviewWriteLimiter` reuse,
  token-only identity (avatar join keys off stored `userId`, never client input), machine-readable
  error `code`s, no `PUT`.
- Update `docs/API_CONTRACT.md` (`/getReviews` shape, `/editReview` body, recipe `rating` shape) and
  its `[HIGH]` caveats list where addressed.
- Tests: Jest — mocked `getUsers` happy/failure paths, breakdown math (incl. review-only null
  ratings and moderation-hidden exclusion), editReview body param, backfill idempotence.

### WS-2 · Frontend plumbing: types + API client + StarRating — **PR-B** (frontend, no visual change)

- `src/types.ts`: `ReviewType`/`OptionalReviewType` gain `userId`, `photoURL: string | null`,
  `displayName: string | null`, `isCurrentUser?: boolean`; `rating: number | null`; recipe
  `rating` type gains `breakdown`.
- `RecipeAPI`: `editReview` → body; drop dead `username` param; typed returns.
- `StarRating`: `role="radiogroup"` + arrow-key/Home/End support in interactive mode, announced
  value, "clear rating" affordance semantics; move hardcoded colors onto tokens (component gets its
  `.scss` per design-system rule). Display mode (`role="img"`) is already right — keep.
- Update the Vitest suites these touch; no rendered-pixel changes intended (safe to land before the
  redesign, and everything here is what the redesign will build on).

### WS-3 · The redesign itself — **PR-C** (frontend; the owner-gated design session)

The heart of §D. File surface: everything under
`src/pages/SingleRecipe/DataSections/RatingsAndReviews/` + its SCSS, plus the `SingleRecipe.tsx`
integration points (hero rating echo :380-388, meta line :454-459, `AddRatingBtn`, the section
render :696).

Design deliverables (do a `design-explorations/reviews/` HTML pass first — house precedent exists
in `design-explorations/single-recipe/author-stats.html`, whose four `★ 4.2 · 8 Ratings` stat-tile
variants are prior art for the summary header):

1. **Summary/breakdown header** — average, star row, count, and the per-star histogram with bars
   (Q1: in); owner picks direction from mockups.
2. **"Your review" card** — visually distinct from the public list; shows your avatar, your stars,
   inline edit affordance; replaces the current bolted-on "Your review" heading + same-card reuse.
3. **Review card** — avatar (`photoURL` → `DefaultAvatar` fallback), `displayName` +
   `@username` identity line (Q4: yes; degrade to handle-only when `displayName` is null), the name
   as `<Link to={'/u/' + username}>` (fold-in B; underline-on-hover + `s.outline()` focus ring,
   matching the #258 byline treatment), stars, date, text.
4. **Add/edit/delete flow** — **review-only submissions allowed** (Q3): drop the client-side
   `rating > 0` gate on `AddReview`; the server already models `rating: null` and a review-only
   post correctly skips the aggregate recompute. Design the composer so stars are invited but
   optional. Plus: textarea with live counter (≥5 / ≤2000), moderation-rejection error surface,
   edit inline vs. the current options row, delete confirm (keep `react-modal` confirm; restyle).
   Cards for star-less reviews need a no-stars variant.
5. **Empty/loading states** — per `docs/design/loading-states.md`; skeleton
   (`ReviewCardSkeleton`) updated to mirror the new card; distinct empty states for
   "no reviews yet" vs "be the first" (signed-in) vs "sign in to rate".
6. **Sort control (Q2: yes)** — reinstate a small `new`/`top` sort toggle; the old dropdown was
   removed and `ReviewsContainer` hardcodes `'new'`, but the server already supports both. Note for
   `top`: Mongo's `{rating: -1}` sorts `null` ratings last, so review-only entries (Q3) naturally
   sink to the bottom — verify in the Jest suite.

Implementation constraints (all from `docs/CONVENTIONS.md`):
- Stay under `pages/SingleRecipe/DataSections/RatingsAndReviews/` (sanctioned nested-feature dir).
- TanStack Query v5 for all fetching — migrate `ReviewsContainer`'s manual page-accumulation
  (`useQuery` + effect + client filter) to the house `usePaginatedLoadMore` pattern (already used by
  `UserRatings`); kill the redundant client-side `reviewText` filter; consider replacing the
  `currUserReview` prop-drilled state through `SingleRecipe` with the `['check-made', recipeId]`
  query as source of truth.
- `ReviewOptions` ownership check: switch from username-string equality to the server-provided
  `isCurrentUser`/`userId` (rename-proof; server already authorizes by uid).
- Design system: tokens from `helpers.scss` only; Lucide via `src/Components/icons` (CI guard);
  hover dialect (content lifts, chrome doesn't); two-focus-signal rule.
- Update Cypress fixture `cypress/fixtures/recipe-reviews.json` (+ any intercept assertions) for the
  new payload shape.

### WS-4 · Docs + release bookkeeping — rides on each PR

- `API_CONTRACT.md` (PR-A), `CONVENTIONS.md` untouched, `RELEASE_PLAN.md` §D flip + status-log
  entry, `BACKLOG.md` fold-in items (#645-652, #161-168) annotated shipped, roadmap deferred-section
  note closed. File new backlog lines for: UserRatings `newAdd` dead sort, timestamp normalization
  (→ data-integrity item), rating-sort-unreachable-from-UI (product call).

---

## 4. Sequencing & delegation plan

Server and frontend ship as **separate PRs** (house process rule). Order matters:

| # | PR | Contents | Depends on | Model tier |
|---|---|---|---|---|
| 1 | **PR-A** (server) | avatar + displayName join, breakdown aggregate + backfill, editReview body | — (decisions resolved) | **Opus/Sonnet** — mechanical against this spec; strong existing Jest suite to extend |
| 2 | **PR-B** (frontend plumbing) | types, API client, StarRating a11y/tokens | PR-A merged (types mirror new payload) | **Opus/Sonnet** — well-specified, test-gated |
| 3 | *(design pass)* | `design-explorations/reviews/` HTML mockups → owner picks | — | Owner + one design-capable session (`frontend-design` skill); mockups themselves are cheap-model-able off a written direction |
| 4 | **PR-C** (frontend redesign) | the §D rewrite | mockup sign-off, PR-A+B merged | The dedicated session the release plan calls for; Opus with the chosen mockup + this doc should suffice — reserve Fable for design synthesis/review if needed |
| 5 | docs flips | RELEASE_PLAN/BACKLOG/roadmap | PR-C landed | any |

Gates for every PR: `npm run typecheck`, `npm test` (Vitest, incl. the icon-guard test),
`npm run build`, `npm run test:server`; PR-C additionally gets a runtime pass with the visual-QA
tooling (`overflow.mjs`/`cardshot.mjs`) at mobile + desktop widths, and the Cypress stubs re-run.
Local env is the **dev** stack (`prepify-dev-58579` / `prepify-dev` Mongo), so destructive testing
is safe.

Rough size: PR-A ≈ half-day session; PR-B ≈ half-day; mockups ≈ one exploration round;
PR-C ≈ 1–2 dedicated sessions (it rewrites ~10 components + SCSS + 4 Vitest suites).

---

## 5. Decisions — resolved by owner, 2026-07-08

1. **Q1 — Rating breakdown histogram: IN.** Per-star counts persisted on the recipe aggregate
   (`rating.breakdown`), recomputed alongside `rateCount`/`rateValue`, one-off backfill (PR-A);
   histogram rendered in the summary header (PR-C).
2. **Q2 — Sort control: YES.** Reinstate a `new`/`top` toggle in the reviews list (PR-C); server
   support already exists.
3. **Q3 — Review-only submissions: ALLOWED.** Drop the client-side rate-first gate; composer makes
   stars optional. Server already models `rating: null` (no server change beyond tests asserting
   the behavior stays); `top` sort sinks star-less reviews to the bottom.
4. **Q4 — displayName on cards: YES.** Returned from the same `getUsers()` batch as `photoURL`
   (PR-A), added to types (PR-B), rendered as `displayName` + `@username` with handle-only
   fallback (PR-C).

---

## 6. Risks & watch-items

- **`getUsers()` latency on the read path**: one batched Admin-SDK call per reviews page; the
  `publicProfile.js` precedent is fine at current scale, but degrade gracefully (null photos) and
  never fail the page on it.
- **Breakdown backfill**: one-off script over recipes with ≥1 rating; reuse the
  `reconcileRatingAggregates.js` diff-then-write pattern; idempotent.
- **Vitest churn**: the four review suites encode the *old* DOM closely; budget PR-C time for
  rewriting them against the new structure rather than contorting the new DOM to keep them green.
- **Scope creep magnet**: helpful-votes, made-it photos, and the data-integrity rekey all border
  this surface — flag-don't-act, file to BACKLOG.
- **N-track seam is clear**: Wave 6 is drained (N4 merged), so §D has no live parallel-work
  conflicts on `RecipeReview.tsx`.

---

## 7. Appendix — current-implementation reference

*(Condensed from the 2026-07-08 code-map pass; endpoint/param detail lives in `API_CONTRACT.md:260-363`.)*

- **Endpoints & behaviors**: `/addRating` (query params, 1–5 float, upsert + recompute);
  `/newReview` (body, ≤2000 chars, moderation-gated, no recompute); `/checkIfReviewed`;
  `/editReview` (query params — moving to body); `/deleteReview` (keeps star if rated, else deletes
  doc; allowed while suspended); `/removeRating` (keeps review if text exists, recomputes);
  `/getReviews` (optionalAuth, `reviewText != ''` + `REVIEW_VISIBLE`, sort new/top, cap 50/page,
  `isCurrentUser` from verified uid); `/getSingleUserReviews` (public, handle→uid, optional
  `$lookup` recipe join with `$toString` id bridge); `/admin/reviews/moderation`
  (hide/restore + recompute + audit + email).
- **Doc shape**: `{ userId, recipeId, username (denormalized, insert-only), rating: number|null,
  ratingLastUpdated: Date|'' (inconsistent), reviewText: string, reviewCreatedAt/reviewLastUpdated:
  epoch-ms-string|'' , moderationHidden?, moderatedBy?, moderatedAt? }`. No photo/displayName.
- **Indexes**: unique partial `{userId,recipeId}`; `{username}`; `{recipeId, reviewCreatedAt:-1}`;
  `{recipeId, rating:-1}`.
- **Aggregate**: recipe doc `rating: {rateCount, rateValue}`; full-scan recompute per rating write
  (`server/util/recipeRating.js`); reconcile script exists; `top` recipe-sort retained server-side
  but unreachable from browse UI.
- **Identity/avatars elsewhere**: `photoURL` lives on Firebase Auth (set via `POST /updatePhoto`,
  binary in Firebase Storage); `DefaultAvatar` initials fallback (`src/util/defaultAvatar.ts`);
  navbar `AccountCard`/`DesktopAccountMenu` are the existing avatar consumers.
