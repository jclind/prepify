# Prepify — Automated Content Moderation

This is the **single living document** for designing and building Prepify's automated
moderation of user-generated text and images. It is both the **reference/spec** (top half)
and the **build tracker** (bottom half). Claude Code comes back to *this file* during the
build — there is no separate planning doc. When scope changes or a phase ships, update the
**Progress** section at the bottom.

Scoped **2026-06-14**. Single-developer estimate: **~2 weeks** for the full P0–P3 build.
**P0 + P1 (text, ~3–4 days) is independently shippable** and delivers most of the value.

## Status legend

- `[ ]` — todo (not started)
- `[~]` — in progress / partial
- `[x]` — done
- `[?]` — needs a decision before it can be done

---

## TL;DR — the core insight

Prepify already has the entire **reactive** moderation pipeline (built in
`docs/ADMIN_FUNCTIONALITY.md`): the `reports` collection, the admin queue, the `auditLog`,
the `moderationHidden`/`status` soft-hide flags, and the Resend email helpers in
`server/util/email.js`. **Automated moderation does not need new infrastructure — it needs a
set of classifiers that feed signals into the pipeline that already exists.** A flagged item
should do exactly what an admin action does today: soft-hide and/or auto-file a `report` into
the queue, with an `auditLog` entry crediting a synthetic `system` actor.

---

## The problem

Every public text and image surface is currently published with **zero pre-screening**.
Anyone with an account can post slurs, harassment, sexual content, spam, or illegal imagery,
and it goes live immediately, visible to all, until a human happens to report it. For a site
that will be open to the public this is both a UX/brand problem and — for images — a **legal**
one (see CSAM, below).

---

## Surfaces that need moderation (the ground truth)

Traced from the current codebase on 2026-06-14.

### Text (cheap, fast → moderate **synchronously at write-time**)

| Surface | Fields | Route | Visibility |
|---|---|---|---|
| Recipes | `title`, `description`, `instructions`, ingredient text, tags | `server/routes/recipes.js` | Public |
| Reviews | `reviewText` | `server/routes/reviews.js` (lives in `ratings` collection, keyed by `(username, recipeId)` — **no stable id**) | Public |
| Profiles | `bio`, `location` | `server/routes/users.js` | Public via `/u/:username` |
| Username / display name | `username`, `displayName` | `server/routes/users.js`, surfaced in URLs + `publicProfile.js` | Public, and appears in the URL |
| Bug reports / report reason | free-text `reason` / description | `bugReports.js`, `reports.js` | Admin-only — lower priority but still ingested |

### Images (expensive, async → moderate via **Storage trigger**, plus a legal layer)

| Surface | Storage path | Upload site |
|---|---|---|
| Recipe images | `recipeImages/{name}` | `src/api/recipes.ts:152` |
| Profile photos | `profilePhotos/{uid}` | `src/context/AuthContext.tsx:220` |

---

## ⚠️ Highest-risk structural gotchas (read before building)

1. **Images are uploaded client-side, directly to Firebase Storage.** Only the resulting
   download URL is POSTed to the server (`recipes.ts:152`, `AuthContext.tsx:220`). **There is
   no server-side upload path to intercept.** Image moderation therefore *cannot* be a simple
   Express middleware. The two viable options:
   - **(Recommended) Firebase Storage `onFinalize` Cloud Function** that scans each new object
     and quarantines/flags. Fits the existing stack; no client refactor. Firebase even ships a
     drop-in extension ("Moderate Images with Cloud Vision API").
   - Route uploads through the Express server (larger refactor + bandwidth cost). Only do this
     if a Cloud Function proves impractical.

   > **What P2 actually shipped (2026-06-15):** neither of the above. The server never sees the
   > *bytes*, but it *does* receive the resulting **URL** at recipe-create/edit time, so recipe
   > images are scanned server-side from that URL (no Functions, no upload re-routing). Profile
   > photos — the only path that didn't touch the server at all — were moved server-side via a
   > new `POST /updatePhoto` endpoint. See P2 for the full rationale.

2. **Reviews have no stable id.** They live inside the `ratings` collection keyed by
   `(username, recipeId)`, with text in `reviewText`. Any auto-flag for a review must key off
   `(username, recipeId)`, exactly like the existing report/moderation paths do.

3. **Soft-hide already ripples through every public read path.** Recipes use a `status` field
   (`status === 'hidden'`), reviews use `moderationHidden`. Auto-mod must reuse these *same*
   flags for takedowns — do **not** invent a parallel state, or some read paths will leak
   flagged content.

   **New for this build:** the medium-confidence "hold for review" decision adds a *third*
   recipe visibility state — `status: 'pending_review'` — that is **owner + moderator visible
   but excluded from public reads**. This is distinct from `'hidden'` (post-takedown). It
   ripples the same way `'hidden'` does, with one extra requirement: owner-facing read paths
   (`getCreatedRecipes`, single-recipe view for the owner) **must still show the owner their
   own pending recipe**, while every public path (`GET /recipes`, search, trending, public
   profile) must exclude it. Budget tests for exactly this split.

4. **Username/displayName moderation is special.** It is checked at signup/rename, appears in
   the URL (`/u/:username`), and a slur here is high-visibility. Pair the classifier with a
   reserved-words / blocklist (the reserved-words blocklist is already a deferred item in the
   account-page work).

5. **Don't moderate from the client.** `VITE_OPEN_AI_API_KEY` exists but is unused. Any
   moderation key must live server-side only — a client-side key is both bypassable and leaked.

6. **CSAM is not "moderation," it's a legal obligation.** General NSFW classifiers do **not**
   detect it, and discovery carries mandatory-reporting duties (US: NCMEC). Treat it as its own
   layer with a purpose-built tool (Cloudflare CSAM Scanning Tool — free; or PhotoDNA / Thorn
   Safer). **This gates any real public launch.**

---

## Design decisions

All resolved **2026-06-14** (the four prior open questions are now settled — see the Confidence
tiers, Text engine, Username timing, and Verification rows).

| Decision | Choice | Why |
|---|---|---|
| **Pipeline reuse** | Flagged content feeds the **existing** `reports` + `moderationHidden`/`status` + `auditLog` + email pipeline | No new infra; admins see auto-flags in the same queue |
| **Synthetic actor** | Auto-actions credited to a reserved `system` / `automod` actor in `auditLog` | Distinguishes machine from human actions; keeps audit honest |
| **Text engine** | **OpenAI Moderation API** (free) + blocklist. Claude Haiku relevance/spam pass **deferred** (not in scope until off-topic spam is actually observed). | Purpose-built free safety classifier; one dep, server-side only |
| **Text strategy** | **Block-on-write** (synchronous, inline 4xx error) for high-confidence | Fast, cheap, best UX; nothing illegal ever goes live |
| **Image strategy** | **Server-side synchronous URL scan at write-time**, reusing the P1 pipeline (recipe images via `worstVerdict`+`holdRecipeForReview`; profile photos via a new `POST /updatePhoto`). *(Revised 2026-06-15 from the original Storage-trigger plan — see P2 for the rationale: no Functions infra, filename-keyed paths, the server already has the URL.)* | Avoids the Blaze plan + a new deploy surface; the recipe doc already exists server-side so no mapping/timing problem |
| **Confidence tiers** | High-confidence → **block** (text) / **auto-hide** (image). Medium-confidence → **hold for review**: see "Medium-confidence hold" below. | Limits false positives nuking legit recipes while never publishing unreviewed risky content |
| **Medium-confidence hold** | **Recipes:** set a new `status: 'pending_review'` — visible **only to the owner + moderators** — and silently auto-file a `report`; goes public when an admin clears it. **Reviews / bio / username:** no meaningful owner-only state, so medium-confidence is treated as **block-on-write** (they're short; ask the user to rephrase). | Owner-only pending is clean for recipes; pointless for a review or bio only the author can see |
| **Username timing** | Moderate at **signup AND every rename** | A slur can never land via a later rename; pairs with the reserved-words blocklist |
| **Verification** | Per phase: **automated tests green (Jest/Vitest) + an authed live smoke test** (post a slur → blocked/held, clean → 200) via `run-prepify` against a real `.env`. See "How to verify" below. | Matches how every other Prepify feature is signed off |
| **Fail-open vs fail-closed** | Text: **fail-open** for transient classifier errors (log + allow), **fail-closed** for blocklist; Images: **fail-closed** (quarantine until scanned) | A 500 from a moderation API shouldn't block all recipe creation; an unscanned image shouldn't be public |
| **Env-gating** | All classifiers no-op silently when their key is unset (mirror `email.js` pattern) | Local/dev/test run without external keys |

---

## Recommended tooling

### Text
- **OpenAI Moderation API** — free, purpose-built (hate/harassment/sexual/violence/self-harm).
  Primary first line. Server-side only.
- **Blocklist / regex** — small curated list of slurs + spam patterns (URLs in usernames,
  repeated chars, etc.) as a cheap zeroth pass that runs even if the API is down.
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) — for what dedicated moderation APIs
  *miss*: domain relevance ("is this actually a recipe, or off-topic spam / link-dropping?"),
  gibberish, promotional content. **Deferred** (decided 2026-06-14) — not in scope until
  off-topic spam is actually observed in production; revisit then.

### Images
- **Google Cloud Vision SafeSearch** or **AWS Rekognition** — adult/violent/racy scoring,
  ~$1–1.50 / 1k images. Run from the Storage trigger.
- **Cloudflare CSAM Scanning Tool** (free) / PhotoDNA / Thorn Safer — the legal CSAM layer.

---

## Phases

### P0 — Foundation + text blocklist (½–1 day) — ✅ shipped 2026-06-14
- [x] `server/util/textModeration.js` — thin, swappable, env-gated wrapper (mirrors `email.js`):
      exports `moderateText(text, context)` → `{ allowed, severity, reason, category, source }`.
      No-ops to a clean verdict when no provider configured. *(Lives in its own file rather than
      the existing `server/util/moderation.js`, which already holds the visibility predicates.)*
- [x] Curated blocklist (`server/util/moderationBlocklist.js`) — slur stems (leet/repeat-normalized,
      Scunthorpe-safe) + identity-only spam patterns, as the zeroth pass inside `moderateText`.
- [x] Reserved `SYSTEM_ACTOR` constant + optional `actorType` on `recordAudit` (default `'admin'`)
      + new `recipe.autohold` audit action.
- [x] Unit tests for the blocklist + no-op gating + severity grading + fail-open (15 cases).

### P1 — Text moderation at write-time (2–3 days) — *primary value* — ✅ shipped 2026-06-14
- [x] Wire OpenAI Moderation into `moderateText` (native `fetch`, no SDK dep), grading a
      `severity` (high / medium / clean) via env-tunable thresholds.
- [x] Apply at recipe create/edit (`recipes.js`), review create/edit (`reviews.js`),
      profile bio/location (`auth.js` `updateProfile`), and **username at signup AND rename**
      (`auth.js` `setUsername`).
- [x] **High-confidence** → inline `422` with a friendly `CONTENT_BLOCKED` message (FE surfaces it).
- [x] **Medium-confidence handling (per surface):**
  - [x] Recipes → save with `status: 'pending_review'` (owner + mod visible only) + silent
        auto-`report` (idempotent) + `recipe.autohold` audit; clears to public on admin approval.
        Owner-facing reads (`getCreatedRecipes`, own single-recipe `getRecipe`) still show it.
  - [x] Reviews / bio / username → treated as a block (`422`, ask to rephrase) — no owner-only state.
- [x] Public read paths exclude `pending_review` (`RECIPE_VISIBLE`); owner reads use
      `RECIPE_OWNER_VISIBLE` (see gotcha #3). **Also fixed the pre-existing `publicProfile.js` leak**
      (it filtered nothing, so it had been exposing `hidden`/`unpublished` recipes too).
- [x] Fail-open on transient API errors (log, don't block); fail-closed on blocklist.
- [x] Tests: high → 422; medium recipe → `pending_review` + queued report + system audit; medium
      review → 422; clean → 201/visible; classifier-disabled/error → allowed; owner-sees-own-pending;
      public-hides-pending (11 route cases, all green).
- [x] Surfaced in the FE: recipe form (`AddRecipe.tsx` — block message + a "pending review" notice
      on hold), review form (`AddReview.tsx`), and profile/settings (`ProfileSection.tsx`) — all reuse
      the existing react-hot-toast / inline-error patterns and `error.response.data.error`.

> **P1 follow-up (not shipped):** `displayName` is set client-side straight to Firebase Auth with
> no server route, so it has no server-side moderation hook. Covering it needs a new server rename
> endpoint or a Firebase **blocking function** (`beforeUserCreated`/`beforeUserSignedIn`). Tracked
> here; out of scope for this slice. Username + bio/location (which DO hit the server) are covered.

### P2 — Image moderation — ✅ shipped 2026-06-15 (server-side, not a Cloud Function)

> **Architecture decided 2026-06-15 (with the user):** *not* a Storage trigger. The
> original `onFinalize` Cloud Function plan was dropped in favour of a **server-side
> URL scan** that reuses the P1 pipeline, because (a) no Firebase Functions infra
> exists yet (`firebase.json` is `{}`) and a trigger forces the paid Blaze plan + a new
> deploy/ops surface, (b) `recipeImages/{filename}` isn't keyed by recipe id and the
> upload fires *before* the recipe doc exists, so a trigger has nothing to map back to,
> and (c) the server already receives the image URL at recipe-create/edit time. The one
> surface that genuinely bypassed the server — profile photos (written straight to
> Firebase Auth) — was brought server-side via a new endpoint. Scanner: **Cloud Vision
> SafeSearch** over REST (no SDK dep, mirrors the OpenAI choice). Tradeoff accepted:
> orphan uploads (images never attached to a doc) aren't scanned; CSAM is P3 regardless.

- [x] `server/util/imageModeration.js` — env-gated `moderateImage(url, context)`, Cloud
      Vision SafeSearch via native `fetch`, graded high/medium/clean from adult/violence/racy
      likelihoods (env-tunable; `racy` only ever contributes medium). No-ops to clean when
      `GOOGLE_VISION_API_KEY` is unset. **Fails CLOSED** (scan error ⇒ medium/`unscanned`).
- [x] **Recipe images** scanned at create/edit, collapsed with the text verdict via
      `worstVerdict` (recipe is only as clean as its worst axis). high → `422`; medium /
      fail-closed → `holdRecipeForReview` (`pending_review` + automod report + audit, reusing
      the entire P1 pipeline incl. `notifyRecipeHidden`). Edit re-scans only when the URL changed.
- [x] **Profile photos** — new `POST /updatePhoto` (auth.js): the client uploads to Storage
      then POSTs the URL; the SERVER scans it and only then sets `photoURL` via Admin
      `updateUser`. high|medium|fail-closed → `422` (no owner-only state, like a bio).
      Client refactor: `AuthContext` routes the `photoURL` write through this endpoint +
      `user.reload()`; `displayName` still goes direct (the known follow-up).
- [x] Quarantine-until-scanned satisfied by the synchronous design: a recipe image is graded
      before the write returns (fail-closed holds an unscanned image); a photo is applied only
      after a clean scan.
- [x] Tests: `imageModeration.test.js` (grading/gating/fail-closed, 14 cases) + route cases in
      `moderation-routes.test.js` (image high/medium/fail-closed hold, worst-of, edit re-scan
      gating, `/updatePhoto` clean/blocked/clear) + FE `AuthContext.test.tsx` photo-flow update.
      `GOOGLE_VISION_API_KEY` (+ image thresholds) added to `server/.env.example`.
- [ ] (Optional) Claude Haiku relevance/spam pass on recipe text. *(Still deferred, as in P1.)*
- [ ] (Deferred) Orphan uploads — images uploaded to Storage but never attached to a doc go
      unscanned under the server-side model; revisit with a periodic sweep or a narrow Storage
      trigger if it proves a real vector.

### P3 — CSAM + hardening (2–3 days) — *gates public launch*

> **DECISION 2026-06-16 — CSAM scanning DEFERRED (not declined), trigger-gated.**
> At current scale (≈0 users, no upload inflow) the realistic CSAM exposure is negligible, while the
> free hash-matchers (PhotoDNA / Google Content Safety) require a multi-week application + vetting and
> an ongoing NCMEC reporting pipeline — i.e. compliance overhead for traffic that doesn't exist yet.
> The Vision SafeSearch adult/racy gate (P2, fail-closed) is the proportionate first line for now.
> The owner is willing to take on the reporting duty; the point of deferral is to *sequence* it to
> when it can actually do good, not to avoid it. **This is reversible** — it's a server-side hook at
> upload, identical in shape to `imageModeration.js`, so adding it later is contained, not a rewrite.
>
> **Chosen approach when triggered:** **PhotoDNA Cloud Service** (free, Microsoft) as a server-side
> hash-match hook at upload — fits the existing Firebase-Storage + server-scan path with no Cloudflare
> dependency (Cloudflare's edge tool would require routing image delivery through Cloudflare, which we
> don't today). Add **Google Content Safety API** later if novel-content (non-hash) detection is wanted.
> **Thorn Safer** is capable but commercial/overkill at this scale. Full rationale: see the
> "CSAM provider" discussion in Progress / chat history.
>
> **Pull the trigger when ANY of these hits:**
> 1. Image uploads open to the general public at real volume (~low hundreds of active users, or
>    unverified/anonymous accounts can upload).
> 2. The **adult-hit canary fires** — `imageModeration.js` now logs `[moderation][adult-canary]`
>    whenever Vision reports `adult >= LIKELY`. Recurring hits = bad actors found the site.
> 3. A new feature invites image uploads beyond recipe photos/avatars (DMs, galleries, image comments).

- [ ] *(deferred, trigger-gated — see decision above)* Integrate PhotoDNA Cloud Service on the image path.
- [ ] *(deferred)* Mandatory-reporting runbook (NCMEC CyberTipline, preserve-don't-delete) documented for when a match occurs.
- [ ] Rate-limit content creation endpoints if not already covered by the security-audit limits.
- [ ] Admin queue: visually distinguish `system`-flagged items + show classifier reason/score.
- [ ] Metrics: counts of auto-hidden / auto-flagged / false-positive-restored.
- [x] **Adult-hit canary** — `imageModeration.js` warns on `adult >= LIKELY` as the early-warning for trigger #2 above (2026-06-16).

---

## Environment variables (to add to `server/.env.example`)

```
OPENAI_API_KEY=            # server-side OpenAI Moderation (free endpoint) — text
MODERATION_ENABLED=        # master toggle for ALL classifiers; off ⇒ they no-op
GOOGLE_VISION_API_KEY=     # server-side Cloud Vision SafeSearch (REST) — images
MODERATION_IMAGE_HIGH=     # optional likelihood threshold (default VERY_LIKELY)
MODERATION_IMAGE_MEDIUM=   # optional likelihood threshold (default LIKELY)
# CSAM tool credentials TBD by chosen provider (Cloudflare / PhotoDNA / Thorn)
```

All keys absent ⇒ the corresponding layer no-ops silently (local/test friendly), exactly like
`RESEND_API_KEY` gates `email.js`.

---

## How to verify (per phase)

Sign-off for every phase = **automated tests green + an authed live smoke test**, matching how
the rest of Prepify ships.

1. **Automated:** `npm test` (frontend Vitest) and `cd server && npm test` (Jest). The phase's
   own test cases (listed in each phase) must pass alongside the existing suites.
2. **Authed live smoke** via the `run-prepify` skill against a real `.env` (needs real
   Mongo + Firebase, and `OPENAI_API_KEY` set so the classifier actually fires):
   - Log in, then **submit a recipe whose description contains an obvious slur** → expect a
     blocked 4xx with the inline message (high-confidence) **or** the recipe saved as
     `pending_review` and absent from public `/recipes` but visible on the owner's account.
   - Submit a **clean** recipe → 200 and visible publicly.
   - Repeat the slur test on a **review** and a **profile bio** → blocked 4xx.
   - With `OPENAI_API_KEY` unset → all writes succeed (env-gated no-op confirmed).
3. **(P2/P3)** Upload a flagged image → confirm it is auto-hidden + queued + owner emailed.

> ⚠️ Use a disposable test account and benign-but-triggering test strings; don't pollute prod
> data. Tear down any test recipes/reviews afterward.

---

## Open decisions

- [?] **CSAM provider** — Cloudflare (free, simplest) vs PhotoDNA vs Thorn Safer. *(P3 only; does
      not block P0–P2.)*

_Resolved 2026-06-14: text engine = **OpenAI Moderation** (Haiku relevance pass deferred);
username moderation = **signup + every rename**; medium-confidence = **`pending_review` hold for
recipes / block for reviews+bio+username**; verification = **tests + authed live smoke**._

---

## Progress

**2026-06-14 — P0 + P1 (text) shipped.** The independently-shippable text slice is complete and
fully tested (server Jest **431/431**, frontend Vitest **361/361**, `tsc` clean).

**2026-06-15 — P1 authed live smoke test PASSED ✅ — P1 is now signed off.** Ran against a real
`.env` (prod Mongo + Firebase) with a live `OPENAI_API_KEY`, driving the API directly with a
throwaway Firebase account (no browser — the moderation logic is all server-side):
- **Blocklist layer (7/7):** recipe/review/bio blocklist-spam → `422 CONTENT_BLOCKED`; clean
  recipe → 201, clean review/bio → 2xx, clean username → 200. (Proves `verdict=high → 422` on
  every surface; needs no OpenAI key.)
- **OpenAI grading (real classifier):** violent-threat recipe/review/bio → `422 CONTENT_BLOCKED`;
  clean recipe → 201; clean bio → 200.
- **Medium-confidence hold (6/6) — the distinctive `pending_review` state:** harassment-band text
  (score 0.649) → `201 pendingReview:true`, recipe saved `status:'pending_review'`, automod
  `report` filed (open/medium) + `recipe.autohold` audit by the `system` actor, **owner read
  returns it (200) while the public read 404s it.** Owner-vs-public split confirmed end-to-end.
- **Fail-open verified for real:** before account credits were loaded the key returned a persistent
  account-level `429`; the classifier failed open exactly as designed (logged, content allowed) —
  no writes blocked by the outage.

All test data torn down; prod verified residue-free. (Cleanup gotcha logged: `updateProfile`
writes bio/location to the `userProfiles` collection — easy to miss when purging test data.)

Shipped:
- **P0 foundation** — `server/util/textModeration.js` (env-gated `moderateText`, blocklist →
  OpenAI grading, fail-open/fail-closed), `server/util/moderationBlocklist.js`, `SYSTEM_ACTOR` +
  `actorType` + `recipe.autohold` in `auditLog.js`.
- **P1 write-time wiring** — recipe add/edit (high→block / medium→`pending_review`+report+audit),
  review add/edit + username + bio/location (high|medium→block). `server/util/automod.js` holds the
  shared `gatherRecipeText` + idempotent `holdRecipeForReview`.
- **Visibility** — `pending_review` added to `RECIPE_VISIBLE` (excluded from all public reads) +
  new `RECIPE_OWNER_VISIBLE`; `getCreatedRecipes` and owner `getRecipe` show the owner their own
  held recipe; **fixed the pre-existing `publicProfile.js` visibility leak**.
- **Frontend** — moderation `422` surfaced on the recipe / review / profile forms; a non-error
  "pending review" toast when a recipe is held. Env vars added to `server/.env.example`.

**2026-06-15 — P1 code-review pass (high effort), 9 findings fixed.** A multi-angle review of
the branch surfaced one critical gap and several integrity/robustness issues; all fixed with
regression tests (server Jest **446** green). One finding (`displayName`) was already a known
follow-up; the central-middleware refactor is deferred (see below).

- **#1 (critical) — ingredient + instruction text bypassed moderation.** `gatherRecipeText` read
  keys that don't exist on real payloads (`ing.ingredient`/`.name`, `step.step`), so only
  `title`/`description` were ever screened. Now reads the real shapes
  (`parsedIngredient.originalIngredientString` + `ingredient`/`comment`, instruction `.content`,
  and `LabelType` `.label` section headers). New `__tests__/automod.test.js` uses the real client
  shapes — the route tests mock `moderateText`, so this was previously untestable.
- **#2 — edit no longer downgrades an admin takedown.** A medium-confidence owner edit of a
  `hidden`/`unpublished` recipe no longer lifts it to the weaker, owner-visible `pending_review`
  (only an admin clears a takedown); the automod report is gated on the same condition.
- **#3 — `addRecipe` whitelists the insert.** Replaced the raw `{ ...body }` spread with
  `pickFields(body, CREATABLE_RECIPE_FIELDS)`; the server stamps `_id`/`userId`/zeroed
  `rating`+counters, so a client can't inject `status`, `featured`, or a forged rating on create
  (symmetric with the edit whitelist).
- **#4 — public-profile count matches the visible list.** `recipesTotalCount` now counts with
  `RECIPE_VISIBLE` instead of the unfiltered account total, so held/hidden recipes no longer
  inflate the number or leak their existence.
- **#7 — `editRecipe` race guard.** A `null` `findOneAndUpdate` result (recipe deleted mid-edit)
  returns `404` instead of `200`-with-null, and skips the hold (no orphan report).
- **#8 — report-gated hold.** `holdRecipeForReview` now files the queue report FIRST, then flips
  the recipe to `pending_review`, then audits — returning a boolean. If the report write fails the
  recipe is left visible (fail-open) rather than disappearing with nothing for an admin to clear.
  The routes no longer stamp `pending_review` inline; the helper is the single owner.
- **#9 — classifier reason fallback.** `flagged: true` with empty category scores now grades
  `medium` with category `flagged` (reason `openai:flagged:0.00`) instead of `openai:null:0.00`.
- **#10 (partial) — `respondBlocked(res)` helper.** The `422 {error, code}` block contract was
  hand-typed at 6 sites across 3 route files; now one helper in `automod.js`.
- **#6 — bio/`profile` spam rules: deliberate decision, no behavior change.** Bios stay on the
  non-identity ruleset (a recipe author linking their own blog is legitimate; promo-phrase patterns
  + OpenAI still apply). `IDENTITY_CONTEXTS` carries a note: adding `'profile'` is the single switch
  that makes bios reject URLs/domains, if bio link-spam is ever observed.

Known follow-ups: server-side `displayName` moderation (needs a Firebase blocking function — see the
P1 note above); **#10 (full) — a central moderation choke point / middleware so a new write route
can't silently ship unmoderated** (deferred to its own focused PR — retrofitting across the 6 write
routes is too broad to fold into this slice); P3 CSAM. None block the text slice.

**P1 was MERGED to development via PR #138 (squash-merged 2026-06-15; remote branch auto-deleted).**

---

**2026-06-15 — P2 (image moderation) built — server-side, NOT a Cloud Function.** Scoped with the
user first; the original Storage `onFinalize` plan was dropped in favour of a server-side URL scan
that reuses the entire P1 pipeline (see the P2 section + design-table rationale: no Firebase Functions
infra exists, the Blaze plan + a new deploy surface were unwarranted, `recipeImages/{filename}` isn't
keyed by recipe id and the trigger would fire before the recipe doc exists, and the server already
receives the image URL). Scanner: **Cloud Vision SafeSearch** over REST (native `fetch`, no SDK).

Shipped:
- **`server/util/imageModeration.js`** — env-gated `moderateImage(url, context)` mirroring
  `textModeration`; grades adult/violence/racy SafeSearch likelihoods → high/medium/clean (env-tunable;
  `racy` caps at medium). No-ops to clean when `GOOGLE_VISION_API_KEY` is unset. **Fails CLOSED**
  (scan error ⇒ medium `unscanned`), the deliberate inverse of text's fail-open.
- **Recipe images** scanned at create/edit, merged with the text verdict via the new
  `automod.worstVerdict` (recipe = its worst axis). high → block; medium / fail-closed →
  `holdRecipeForReview` (`pending_review` + automod report + audit + owner email). Edit re-scans only
  when the URL changed (no re-hold / cost on a plain text edit).
- **Profile photos** — new `POST /updatePhoto` (auth.js): client uploads to Storage, server scans the
  URL and only then sets `photoURL` via Admin `updateUser`. high|medium|fail-closed → `422` (no
  owner-only state, like a bio). `AuthContext` + `AuthAPI` refactored to route the photoURL write
  through it (+`user.reload()`); `displayName` still direct.
- **Tests/env:** `imageModeration.test.js` (14) + image route cases in `moderation-routes.test.js`
  (`firebase-admin` mock gained `updateUser`) + FE `AuthContext.test.tsx` photo-flow update. Env added
  to `server/.env.example`. **server Jest 468, FE Vitest 362, tsc clean.**

**2026-06-15 — P2 authed live smoke PASSED ✅** against a real `GOOGLE_VISION_API_KEY` (Cloud Vision API
enabled + billing on `prepify-9b974`), driving the worktree server's real routes with a throwaway
Firebase account (no browser). Benign images only — the block/hold tiers were proven by lowering the
likelihood threshold so a clean image's real verdict crosses it, never by sourcing explicit content:
- **Real classifier fires:** a real Firebase Storage recipe-image URL is fetched and graded by Vision
  (`source: vision`, all `VERY_UNLIKELY` → clean). Confirmed Vision *can* fetch `firebasestorage.googleapis.com`
  URLs via `imageUri` (a 3rd-party HTTPS URL, gstatic, was refused — irrelevant to our surfaces, and it
  **fail-closed** correctly: `severity: medium, source: error`).
- **Clean tier (3/3):** clean image → `addRecipe` 201 not-pending (published); `updatePhoto` 200; clear 200.
- **High tier (3/3, threshold forced to VERY_UNLIKELY):** real verdict graded high → `addRecipe` 422,
  `updatePhoto` 422; cleanup confirmed the blocked recipe wrote **zero rows**.
- **Medium tier (4/4, threshold forced):** real verdict graded medium → recipe `201 pending_review`,
  **owner read 200 / anonymous read 404** (the held-recipe visibility split), automod `report` + audit
  filed (reports=1, audit=1), `updatePhoto` medium → 422 (photos block, no owner-only state).

All test data torn down; prod verified residue-free (0 leftover recipes / 0 recent automod reports).
Server restored to normal thresholds afterwards.

⚠️ **PROD ENV STEP** to add to Railway when shipping: `GOOGLE_VISION_API_KEY` (absent ⇒ image layer
no-ops; text moderation unaffected). Optional `MODERATION_IMAGE_HIGH` / `MODERATION_IMAGE_MEDIUM`.

**2026-06-15 — P2 code-review pass (high effort), 2 fixes applied.** A focused review of the P2 diff
found the build sound (correct fail-closed routing, SSRF-safe via Vision `imageUri`, no DB leakage of raw
scores). Two findings were fixed (own follow-up commit):
- **M1 (perf):** `moderateText` + `moderateImage` ran serially on `addRecipe`/`editRecipe`; now run via
  `Promise.all`. Both resolve internally (text fails open, image fails closed) so `Promise.all` can't
  short-circuit on an outage — cuts the added latency from `OpenAI + Vision` to `max(OpenAI, Vision)`.
- **M2 (fail-closed gap):** `callVision` graded a 200 with no `error` *and* no `safeSearchAnnotation` as
  clean — a narrow fail-*open* hole in a fail-closed design. It now throws on a missing annotation so the
  image is held, never published unscanned. Added a unit test for that case (server Jest 468 → 469).

  Low/nit findings (L1 photo now commits before later profile steps — intentional reject-early ordering;
  L2 `updatePhoto` accepts an arbitrary URL — not a regression, non-Storage URLs fail-closed anyway;
  L3 no per-image dedupe on create; doc-drift nits) were reviewed and deferred as non-blocking.

**2026-06-15 — follow-ups found during the user's own prod smoke (logged, not yet fixed):**
- **FE error surfacing (P1 UX bug) — ✅ FIXED 2026-06-15.** The server's 422 block response carries a
  friendly body (`{ error: BLOCKED_MESSAGE, code: 'CONTENT_BLOCKED' }`), but `CreateUsername` showed
  axios's generic "Request failed with status code 422" (it surfaced `err.message`). Added a shared
  `src/util/getApiErrorMessage(error, fallback)` helper (prefers `response.data.error`) and used it in
  CreateUsername; folded the existing inline duplicates in `AddReview` and Settings `ProfileSection` onto
  it. The recipe paths (`api/recipes.ts` add/edit → `result.message`) already read `response.data.error`.
  Net: every moderated surface — onboarding username, settings username/bio/photo, reviews, recipe
  create/edit — now shows the friendly moderation message. The 422 status itself was always correct.
- **Blocklist evasion gaps (P1 hardening).** ✅ **DONE 2026-06-16** (`moderationBlocklist.js`). Was:
  token-boundary matching let a concatenated slur with no separator (`shitfuck`) and letter-spacing
  (`s h i t`) pass; `shit_fuck` / `shit` / `fuck` were already caught. Fix adds two passes around the
  existing exact-token match, designed around the Scunthorpe problem on a *recipe* site:
  - **Letter-spacing pass** — maximal runs of single-character tokens (`s h i t`, `n.i.g.g.e.r`,
    `f*u*c*k`) are rejoined and re-scanned with the wide pass. Adversarial signal ⇒ strict.
  - **Substring pass, tiered** — `SUBSTRING_SLURS` (`nigger`/`cunt`/`asshole`, unambiguous) match as a
    substring on **every** surface; the substring-prone rest (`shit`/`fuck`/`faggot`/`retard`/…) match
    as substrings **only on identity fields** (username/displayName), and still as exact tokens
    everywhere. Long-form prose leans on the OpenAI layer for obfuscated profanity to avoid
    false-positives.
  - **`BENIGN_ALLOWLIST`** guards the substring pass: `scunthorpe`, `shitake`/`shiitake`, `shitzu`,
    `retardant`, `niggardly` — a token equal to one of these is exempt from substring scanning.
  - Result: `shitfuck`/`shitlord` (identity), `niggerlover`/`megaasshole`/`xXcuntXx` (anywhere), and
    `s h i t`/`n i g g e r`/`f.u.c.k` all now blocked; `shiitake`/`shitake`/`Scunthorpe`/`fire retardant`/
    `classic`/`push it`/`viscount`/`glasshouse` all stay clean. Tests: +4 cases in `textModeration.test.js`
    (catches + FP guards). server 476 green.
- **Reminder:** moderation only runs where the code is deployed AND the keys are present. Prod hadn't
  shipped moderation yet at the time of this smoke (a slur username + review went through on the live
  site — cleaned up via account delete). The `OPENAI_API_KEY` + redeploy is the pending Railway step.

**2026-06-15 — comprehensive authed live smoke across EVERY write surface (worktree server :4005, real
blocklist + OpenAI, throwaway accounts, prod DB swept after). 14/14 effective.** Every server-side surface
moderates correctly:
- ✅ **username** (setUsername) — slur→422, clean→200
- ✅ **bio** + **location** (updateProfile, joined `profileText`) — slur/spam→422, clean→200 (location
  re-confirmed with a bounded trigger: `shit head`→422, `buy now plaza`→422, `Denver`→200)
- ✅ **recipe** create — slur in TITLE / INGREDIENT / INSTRUCTION each→422 (confirms `gatherRecipeText`
  field coverage), clean→201 published
- ✅ **recipe** edit (editRecipe) — slur→422
- ✅ **review** create + edit (newReview/editReview) — slur/spam→422, clean→200
- ✅ **OpenAI layer live** — a violent threat with NO blocklist token still→422 (proves the AI grade, not
  just the blocklist)
- ✅ **displayName — FIXED 2026-06-16 (was THE GAP the user hit).** New server `POST /updateDisplayName`
  (auth.js) mirrors `updatePhoto`: validates (required, ≤50 chars) → `moderateText(name, 'displayName')`
  (both high+medium block, identity spam rules apply) → `admin.auth().updateUser`. `AuthContext` and
  `CreateUsername` now route displayName through `AuthAPI.updateDisplayName` + `user.reload()` instead of
  the client Firebase `updateProfile` (import dropped from both). Tests: 3 route cases + updated FE
  AuthContext/CreateUsername suites (server 472 / FE 366 / tsc). **Live smoke 6/6** (real classifier +
  Firebase): slur/spam→422, clean applied (trimmed) and confirmed on the real account, >50/empty→400.
- ⚠️ Re-confirmed the evasion gaps applied to ALL these text surfaces (concatenated `shittown`/`shitfuck`,
  spaced `s h i t`) — **now hardened 2026-06-16, see above.**

_Next: P2 + the displayName/UX fixes + blocklist hardening are on PR #139 (into development). P3 CSAM
still needs a provider decision (Cloudflare / PhotoDNA / Thorn) — ask the user before integrating. No
P1 follow-ups remain._
