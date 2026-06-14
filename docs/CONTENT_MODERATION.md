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
| **Image strategy** | **Async scan → auto-hide → queue** (can't block a Storage trigger) | Matches the upload architecture |
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

### P0 — Foundation + text blocklist (½–1 day)
- [ ] `server/util/moderation.js` — thin, swappable, env-gated wrapper (mirror `email.js`):
      exports `moderateText(text, context)` → `{ allowed, reason, severity }`. No-ops to
      `{ allowed: true }` when no provider configured.
- [ ] Curated blocklist (slurs + spam patterns) as the zeroth pass inside `moderateText`.
- [ ] Reserved `system`/`automod` actor constant + helper for `recordAudit`.
- [ ] Unit tests for the blocklist + no-op behavior.

### P1 — Text moderation at write-time (2–3 days) — *primary value*
- [ ] Wire OpenAI Moderation into `moderateText`, returning a `severity` (high / medium / clean).
- [ ] Apply at recipe create/edit (`recipes.js`), review create/edit (`reviews.js`),
      profile bio/location (`users.js`), and username/displayName at **signup AND rename**.
- [ ] **High-confidence** → return inline 4xx with a friendly message (FE surfaces it on the form).
- [ ] **Medium-confidence handling (per surface):**
  - [ ] Recipes → save with `status: 'pending_review'` (owner + mod visible only) + silent
        auto-`report`; clears to public on admin approval. Owner-facing reads must still show it.
  - [ ] Reviews / bio / username → treat as a block (4xx, ask to rephrase) — no owner-only state.
- [ ] Public read paths exclude `pending_review`; owner read paths include it (see gotcha #3).
- [ ] Fail-open on transient API errors (log, don't block); fail-closed on blocklist.
- [ ] Tests: high → 4xx; medium recipe → `pending_review` + queued; medium review → 4xx;
      clean → 200 (and visible publicly); API-down → allowed + logged; owner-sees-own-pending.
- [ ] Surface the inline 4xx in the FE: recipe form (`src/pages/AddRecipe*`), review form, and
      profile/settings forms — locate the existing form error handling before adding new UI.

### P2 — Image moderation (3–4 days)
- [ ] Firebase Storage `onFinalize` Cloud Function (or the Cloud Vision extension).
- [ ] SafeSearch scan on `recipeImages/` + `profilePhotos/` uploads.
- [ ] On hit: set the existing `status`/`moderationHidden` flag on the owning doc +
      auto-file a `report` + `auditLog` entry + owner email (reuse `notifyRecipeHidden` etc.).
- [ ] Quarantine-until-scanned default so unscanned images aren't publicly served.
- [ ] (Optional) Claude Haiku relevance/spam pass on recipe text.

### P3 — CSAM + hardening (2–3 days) — *gates public launch*
- [ ] Integrate Cloudflare CSAM Scanning Tool (or PhotoDNA/Thorn) on the image path.
- [ ] Mandatory-reporting runbook (NCMEC) documented for when a match occurs.
- [ ] Rate-limit content creation endpoints if not already covered by the security-audit limits.
- [ ] Admin queue: visually distinguish `system`-flagged items + show classifier reason/score.
- [ ] Metrics: counts of auto-hidden / auto-flagged / false-positive-restored.

---

## Environment variables (to add to `server/.env.example`)

```
OPENAI_API_KEY=            # server-side OpenAI Moderation (free endpoint)
MODERATION_ENABLED=        # master toggle; off ⇒ moderateText no-ops
GOOGLE_VISION_CREDENTIALS= # or GCP application-default creds for SafeSearch
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

_Not started (scoped 2026-06-14; all P0–P2 decisions resolved same day). Update this section as
phases ship — mirror the format used in `docs/ADMIN_FUNCTIONALITY.md`._
