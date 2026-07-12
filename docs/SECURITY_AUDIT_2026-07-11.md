# Prepify — Security & Abuse Audit

**Date:** 2026-07-11 · **Target:** local dev stack (`prepify-dev-58579` Firebase + `prepify-dev` Mongo), API on `:4000`
**Method:** 9-dimension static review → live exploitation. Every finding below was **reproduced against the running server** with real requests + a control, using minted user / second-user / admin Firebase tokens. 44 agents, 35 candidates, **32 confirmed / 3 refuted**.

> Scope note: this hit **dev**, not production. All data I created is prefixed `SECAUDIT-` and is purgeable. No production host was touched.

---

## Remediation log

**Batch 1 (2026-07-11)** — verified-before-fixed against dev, each with a live repro + a re-run proving closure and a passing control:

| Finding | Status | Fix summary |
|---|---|---|
| **H1** · paid-API aggregate cost ceiling | ✅ Fixed | New `server/util/paidQuota.js` — per-account + **global** daily counters (Mongo, TTL-reaped) mounted on `/ingredients/parse`, `/nutrition/details`, and recipe creates; `ingr` array length-capped. Live proof: per-account cap trips, and the global ceiling stops a **fresh** account (Sybil defeat). |
| **M1** · review endpoints leak reviewer/admin UIDs + stamps | ✅ Fixed | Inclusion projection on `getReviews`/`getSingleUserReviews` + `publicRecipeProjection` on the `$lookup` sub-pipeline. `userId`/`moderatedBy`/`moderatedAt`/`moderationHidden` + recipe internal stamps no longer reach public callers. |
| **M2** · ratings/reviews never load target recipe | ✅ Fixed | `addRating`/`newReview` now load the recipe: 404 on missing/hidden, 403 on self-rating. |
| **M3** · client-controlled `authorUsername` | ✅ Fixed | Removed from `CREATABLE_RECIPE_FIELDS`; derived server-side from `req.uid`→username at create. |
| **M4** · `servingPrice` recompute defeats its bounds check | ✅ Fixed | `servingPrice` recomputed onto the body **before** `validateRecipeBounds` on create + edit, so the persisted value is bounds-checked. |
| **L1** · two write routes missing `requireActive` | ✅ Fixed | Added `requireActive` to `/nutrition/details` and `/acknowledgeAchievements`. |

Deferred to follow-up waves: **M5/M6/M7** and the remaining **LOW/INFO** items (L2–L6, I1–I2).

---

## TL;DR

The **hard perimeter holds.** The scary classes came back clean: **no NoSQL injection**, **no mass-assignment privilege escalation** (you can't forge `isAdmin`/`authorId`/`points`/`rating` — the field-allowlist blocks it), admin routes are correctly gated by `requireAdmin`, and cross-user object tampering (IDOR on edit/delete) is enforced by `req.uid` ownership checks.

What remains is a consistent, lower-blast-radius theme in two buckets:

1. **Information leakage** — public read endpoints over-return internal identifiers (Firebase UIDs of reviewers *and* moderating admins, plus recipe "internal stamps").
2. **Business-logic / abuse** — ratings, rankings, gamification XP, and the paid third-party APIs can be gamed or drained because the endpoints don't validate the *target* or bound *aggregate* cost.

**One HIGH:** the paid Spoonacular/Edamam/Vision/OpenAI endpoints are rate-limited per-account-per-minute but have **no aggregate or daily ceiling**, so an attacker who spins up fresh accounts (Sybil) multiplies the paid budget linearly — a direct dollar-cost DoS on your API bill.

---

## What's already solid (refuted findings — good news)

| Area | Verdict |
|---|---|
| **NoSQL / Mongo operator injection** | **Defended.** `query parser: 'simple'` neutralizes query-string operators; body-field lookups are type-guarded. Live operator-injection payloads (`{$ne:null}`, `$gt`) did not bite. |
| **Mass-assignment privilege escalation** | **Blocked.** `POST /addRecipe` builds the doc via `pickFields(body, CREATABLE_RECIPE_FIELDS)` — an allowlist. Injected `isAdmin`, `authorId`, `uid`, `points`, `rating`, `status` fields are dropped, confirmed live. |
| **IDOR on edit/delete** | Ownership is enforced by `req.uid` on the mutating recipe/review/draft/collection routes. |
| **Admin route gating** | `requireAdmin` correctly 403s a normal token on every `/api/admin/*` route tested. |
| **OG/Twitter meta URL injection** | Latent-only; not currently exploitable (no non-escaping SSR serializer in the path). |

Keep the allowlist + `query parser: simple` patterns — they're doing real work.

---

## HIGH

### H1 · Paid third-party APIs have no aggregate cost ceiling (Sybil quota drain)
**Category:** rate-limit / financial-DoS · **Endpoints:** `POST /api/ingredients/parse`, `POST /api/nutrition/details`, recipe writes (Cloud Vision + OpenAI moderation)

The only defenses on the metered endpoints are **per-user-per-minute** limiters (`nutrition` 30/min/uid, `ingredients/parse` a small per-uid cap) plus the global **1000/15min per-IP** backstop. There is **no per-account daily cap and no global aggregate ceiling**. Because a fresh Firebase account resets the per-uid budget and IPs are trivially rotated, cost scales linearly with the number of accounts an attacker creates — every call spends real Spoonacular/Edamam/Vision/OpenAI money.

- **Impact:** An attacker with N throwaway accounts can sustain N × 30 paid nutrition calls/min (plus parse + moderation) indefinitely. This is a bill-inflation / quota-exhaustion attack, not a data breach — but it's the highest-leverage finding because it costs *you* money and can exhaust quota for real users.
- **Fix:** Add a **daily per-account cap** and a **global daily ceiling** (counter in Mongo/Redis) on each paid surface, tripped well below your billing comfort line. Consider requiring `email_verified` before any paid call (raises Sybil cost — see M6). Alert on aggregate spend.

Related lower-severity facets rolled up here: unbounded `ingr` array on `/nutrition/details` (no element/length cap beyond the 100 kb body limit); `/nutrition/details` and `/acknowledgeAchievements` also skip `requireActive` (see L1).

---

## MEDIUM

### M1 · Public review endpoints over-return internal identifiers (UID + admin-moderator leak)
**Category:** info-leak · **Location:** `server/routes/reviews.js` — `GET /getReviews` (289-307), `GET /getSingleUserReviews` (311, 391-411)

Both endpoints are public (no/soft auth) and return raw Mongo docs with **no field projection**, disclosing to anonymous callers:

- **`userId`** — the **Firebase UID of every reviewer** (a `username → UID` oracle). Re-confirmed live: an unauthenticated `GET /api/getReviews?recipeId=…` returned `userId: "attacker-userA"`.
- **`moderatedBy` / `moderatedAt`** — the **admin UID + timestamp** for any review that was taken down and later restored.
- **`returnRecipeData=true`** joins the full recipe doc with **no `$project`**, leaking `RECIPE_INTERNAL_STAMPS` (`featuredBy`, `moderatedBy`, `publishUpdatedBy` — admin UIDs the code explicitly says "must never reach a non-admin caller"). Every *other* public recipe read strips these via `publicRecipeProjection`; this join path bypasses it.

- **Impact:** Anonymous enumeration of user and **admin** Firebase UIDs and moderation activity — a targeting/reconnaissance primitive (correlate admins to actions, seed other UID-keyed probes). No write access.
- **Fix:** Apply an **inclusion projection** (allowlist of display fields) to both `find()` queries, and add a `$project`/`$unset` of `moderatedBy/moderatedAt/moderationHidden` + `publicRecipeProjection` to the `$lookup` sub-pipeline. Never serialize `userId`/internal stamps to non-admin callers.

### M2 · Ratings & reviews never load the target recipe (self-rating, hidden/ghost targets, XP farming)
**Category:** business-logic · **Location:** `server/routes/reviews.js` — `POST /addRating` (52-94), `POST /newReview` (97-138)

Neither handler loads the recipe it's rating. Consequences, all live-confirmed:

- **Self-rating:** an author can rate + review **their own** recipe, inflating its public average.
- **Ghost/hidden targets:** `addRating` accepts arbitrary, **nonexistent, or hidden** `recipeId`s and still upserts a rating + runs `recomputeRecipeRating()`.
- **Gamification farming:** because reviews on nonexistent recipes count, XP/achievements are farmable with junk `recipeId`s (`getGamification` counts reviews without validating targets).

- **Impact:** Rating integrity (the signal that drives trust + ranking) is forgeable; leaderboards/achievements are farmable. No direct data exposure.
- **Fix:** In both handlers, `findOne` the recipe first; **404 if missing/hidden**, and **403 if `recipe.authorId === req.uid`** (block self-rating). Enforce one-rating-per-user-per-recipe with a unique index, not check-then-write.

### M3 · `authorUsername` is client-controlled and unvalidated (author impersonation)
**Category:** mass-assignment · **Location:** `server/util/recipeFields.js:42` (`authorUsername` in `CREATABLE_RECIPE_FIELDS`), `recipes.js:552-575`

`authorUsername` is on the creatable allowlist and is persisted verbatim — never checked against the caller's real username. A user can publish a recipe whose displayed author is **someone else's handle**.

- **Impact:** Public attribution spoofing (impersonate a popular creator or staff handle on recipe cards). The true owner (`authorId`) is correct server-side, but the *displayed* author is a lie.
- **Fix:** Don't accept `authorUsername` from the client — derive it server-side from the `req.uid`→username mapping at write time. Remove it from `CREATABLE_RECIPE_FIELDS`.

### M4 · `servingPrice` recompute defeats its own bounds check
**Category:** business-logic / input-validation · **Location:** `recipes.js:573 & 659` — `servingPrice = calculateServingPrice(...)` runs **after** `validateRecipeBounds`

`validateRecipeBounds` checks `servingPrice`, but the value is then **recomputed** from client-supplied `ingredientData.totalPriceUSACents` *after* the check — so a forged/negative/over-cap ingredient price yields an out-of-bounds persisted `servingPrice` that the bounds check never sees.

- **Impact:** Negative or absurd serving prices persist and render; corrupts price-based sort/filter. Data-integrity, not exposure.
- **Fix:** Recompute `servingPrice` **before** `validateRecipeBounds`, and validate the recomputed value (and the `ingredientData` price inputs) rather than a client-provided figure.

### M5 · Ranking counters are inflatable (views, saves, "made", totalTime)
**Category:** business-logic · **Location:** `recipes.js` — unconditional `$inc views` on `GET /getRecipe` (472-479); `/save` (865), `/madeRecipe` (957); `totalTime` on the creatable allowlist (sort key)

- **View inflation:** `GET /getRecipe` unconditionally `$inc`s `views` with **no auth and no throttle** — anyone (or a loop) can pump a recipe up the Trending/Popular rows.
- **Self-save / self-made:** an author inflates `numTimesSaved` / `numTimesMade` (both drive default browse ranking) on their own recipe.
- **`totalTime`** is author-supplied and not reconciled with `prepTime + cookTime`, so shortest/longest sorts are gameable.

- **Impact:** Browse/Trending/Popular ordering is manipulable — a spam/SEO-style abuse of discovery surfaces.
- **Fix:** Throttle/dedupe view counting (per-session/IP debounce, or drop live view-driven ranking); exclude self-saves/self-makes from ranking counters; derive `totalTime` server-side.

### M6 · Username & account-identity integrity gaps
**Category:** business-logic / info-leak · **Location:** `server/routes/auth.js` — `validateUsername` (75-92), `setUsername` (132-210), `GET /checkUsernameAvailability` (107-117)

- **No reserved-handle blocklist:** `admin`, `support`, `prepify`, etc. are freely registerable (staff impersonation).
- **Look-alike squatting:** no separator-placement / near-duplicate rule → `j.smith` vs `j_smith` vs `jsmith` variants.
- **Enumeration oracle:** `GET /checkUsernameAvailability` is unauthenticated → scriptable handle/user enumeration.
- **No `email_verified` gating:** unverified accounts can perform all identity/content writes (also lowers the cost of the H1 Sybil attack).

- **Fix:** Add a reserved-name blocklist + normalized-uniqueness check (case/separator/unicode-fold); rate-limit or authenticate the availability check; gate content/paid writes on `email_verified`.

### M7 · Moderation-queue flooding channels
**Category:** rate-limit · **Location:** `reports.js:48-51,93-185`; `bugReports.js:50-96`

- **Report flooding:** 10 distinct-target reports/min/account (`reportLimiter`) → a single account bloats the moderation queue; combined with the recipe self-report gap (I2) and no dedupe, reports are a griefing vector.
- **Bug-report channel:** `POST /api/bug-reports` is **unauthenticated and not content-moderated** — an open spam/abuse pipe straight into the admin queue.

- **Fix:** Authenticate + moderate bug reports; dedupe reports per (reporter, target); consider a lower report cap and a per-target report ceiling.

---

## LOW (17 — grouped)

- **L1 · Banned users retain access to two write routes.** `POST /api/nutrition/details` and `POST /api/acknowledgeAchievements` omit `requireActive` (every recipe/review write has it). A banned/suspended account keeps burning paid Edamam quota and mutating gamification state for the ~1 h token lifetime. **Fix:** add `requireActive` to both. *(Re-confirmed live: both route defs lack the middleware.)*
- **L2 · Stored `javascript:` / `data:` URLs.** `recipeImage`/URL fields are persisted with no scheme validation (`validateRecipeBounds` doesn't check URLs). Not currently executed (React escapes the sink), but a latent stored-XSS if any field is ever rendered into an `href`/`src` raw. **Fix:** allowlist `https:` URL schemes at write time.
- **L3 · `nutritionData` persisted verbatim.** No shape/type/size validation; served publicly. **Fix:** validate structure + size, or recompute server-side.
- **L4 · Layout-breaking content.** Unbroken long strings + RTL/zalgo unicode in reviews/titles/descriptions break layout for all viewers; text moderation is **env-gated OFF when `OPENAI_API_KEY` is unset** (so dev + any key-less deploy has *no* moderation). **Fix:** CSS `overflow-wrap`/`word-break` + length caps; ensure moderation is on in prod, fail-closed on missing key.
- **L5 · No recipe-create idempotency.** A replayed/multi-tab submit produces duplicate recipes — each a paid moderation+vision pass. **Fix:** client idempotency key or server dedupe window.
- **L6 · Username availability / existence oracle** (same root as M6) — unauthenticated enumeration.

*(Several L-items overlap the M-cluster roots above — e.g. self-rating, reviewer-UID leak, look-alike usernames were each surfaced by multiple finder agents and are consolidated into M1/M2/M6.)*

---

## INFO

- **I1 · No Content-Security-Policy on the SPA.** `helmet()` sets headers on API JSON only; the SPA HTML ships no CSP. Any future XSS would be unmitigated. **Fix:** add a CSP (Netlify header or meta) — `default-src 'self'`, tighten `script-src`.
- **I2 · Recipe reports have no self-report guard** (the guard exists only for review/user targets). Lets an author report their own recipe (queue-noise / abuse combined with M7).

---

## Suggested order of operations

1. **H1** — put a daily/aggregate cap + spend alert on the paid endpoints (real-money exposure).
2. **M1** — projection on the review endpoints (stop leaking reviewer + admin UIDs). Small, high-value.
3. **M2 + M3 + M4** — the ratings/authorship/price integrity trio (all in `reviews.js` / `recipes.js`, cheap fixes with clear correctness wins).
4. **L1** — add `requireActive` to the two missing routes (one-line each).
5. **M6 / M7 / M5** — identity + anti-abuse hardening as a follow-up wave.
6. **I1** — CSP as defense-in-depth.

All 32 confirmed findings carry live request/response evidence in the workflow journal if you want the raw proofs for any specific item.
