# Security sweep

> **Status:** Run 2026-06-26 — **PR #197**. Authz/IDOR, CORS, secrets-in-git, and XSS all clean. Cheap
> hardening shipped (`madeRecipe` counter-inflation, `reports` username→uid oracle, `addRating` limiter,
> review-route type guards); 8 follow-ups filed → [BACKLOG → Security](../BACKLOG.md#security) (headline:
> revoke the live OpenAI key on disk). *(See the [run log](README.md#run-log).)*

Full-coverage security audit of the Prepify client + API: secrets, authentication/authorization (incl.
IDOR), input validation, rate limiting, CORS, Firebase rules, dependency CVEs, and data exposure /
XSS. **Read-and-report first** — surface findings, fix only the clearly-safe ones, never weaken a check.

> Read [`README.md`](README.md) first. This is the security-specific brief. For a focused review of just
> the current diff, prefer the `/security-review` skill instead.

## Kickoff

```
/worktree-create security sweep — secrets, authz, validation, deps, CORS, firebase rules

Read docs/sweeps/security.md and docs/sweeps/README.md. Do a structured security pass over the client and
server. Report every finding with severity + a file ref; fix only small, unambiguous hardening; file the
rest to docs/BACKLOG.md and (if launch-gating) flag it in RELEASE_PLAN.md §C. Do NOT weaken any existing
control. Open a PR with the findings table.
```

## The pass

1. **Secrets & key exposure.** `.env` / `server/.env` are gitignored — confirm none are committed
   (`git log -p` for leaked keys; the repo had a track-0a hygiene pass). Remember **every `VITE_`-prefixed
   var is shipped to the browser** by design, so verify no *server* secret hides behind a `VITE_` name. Flag
   client-exposed third-party keys that should be proxied: `VITE_OPEN_AI_API_KEY` and the Edamam app
   id/key live in the client `.env` and ride along in the bundle — these belong behind the server. Confirm
   `.env.example` carries no real values.
2. **Authentication.** Firebase ID tokens are verified server-side via the auth middleware
   (`server/middleware/*`, Admin SDK) which sets `req.uid`. Check: every state-changing route is behind
   `verifyToken` (and `requireActive` where it matters), tokens are actually *verified* (not just decoded),
   and expired/forged tokens are rejected. The `optionalAuth` paths (`/getRecipe`, `/recipes/random`) must
   degrade safely, never trust a client-supplied uid.
3. **Authorization & IDOR.** This is the highest-value check. For every route that mutates or returns
   user-owned data, confirm it scopes by `req.uid` server-side — not by an id from the request body. Probe:
   can user A edit/delete user B's recipe (`editRecipe`/`deleteRecipe` — do they check `authorId === req.uid`?),
   read B's drafts/saved/ratings, or hit an admin route without the admin claim? Admin is gated by
   `AdminRoute` (client) **and** an `isAdmin` claim server-side — the client gate is cosmetic; the server
   check is the real one. Verify moderation/report/user-admin endpoints all re-check the claim.
4. **Input validation & uploads.** Validate/clamp recipe + review + profile payloads server-side (lengths,
   types, numeric ranges — don't trust the client). File uploads: enforce size (the 5 MB check) and MIME/
   extension on **both** ends (client check is UX only). Username rules (track 3c) and the report/contact
   forms. Confirm Mongo queries are built from typed/validated values, never string-concatenated user input
   (`recipeIdQuery` etc. should cast/validate the id).
5. **Rate limiting & abuse.** `recipeWriteLimiter` guards recipe writes — check the rest: login/signup
   (credential stuffing), password reset, review/rating spam, report spam, the contact form, and the
   ingredient-parse / nutrition proxy endpoints (cost-bearing). Note anything unprotected.
6. **CORS.** `server/app.js` builds `allowedOrigins` from `FRONTEND_URLS`, plus a Netlify-preview pattern
   and a **non-prod** localhost:3000–3010 allowance (regex, never applied when `NODE_ENV=production`).
   Verify prod genuinely locks to the real origin(s), credentials handling is correct, and the dev pattern
   can't leak into prod.
7. **Firebase Storage / rules.** Review Storage rules: who can upload (size/type/path constraints, auth
   required), who can read, and whether a user can overwrite another user's avatar/recipe image path. (The
   gameplan's track-0c covers dashboard-side key referrer + quota lockdown — cross-check it's done.)
8. **Dependency CVEs.** `npm audit` at root and in `server/` (the gameplan noted ~3 high each). Triage:
   real exploit path vs transitive/dev-only; bump or document. Don't `--force` fix blindly.
9. **Data exposure & XSS.** Do API responses leak PII or internal fields (emails, uids, moderation state,
   report contents) to the wrong audience — especially the **public** profile + recipe payloads? React
   escapes by default, so hunt the exceptions: `dangerouslySetInnerHTML`, user-controlled `href`/`src`
   (block `javascript:`/`data:` in bios, links, share URLs), and Markdown/rich-text if any. Check the
   `noindex`/robots story on private + not-found pages.

## Tooling & where to look

- `server/middleware/`, `server/routes/*.js` (the `verifyToken` / `requireActive` / `optionalAuth` /
  `requireAdmin` decorators per route), `server/app.js` (CORS), `server/db.js`.
- Client: `src/context/AuthContext.tsx`, `src/api/http-common.ts` (Bearer attach), `src/api/*`.
- `npm audit` (root + server), `git log -p -- '*.env*'`, Firebase Storage/Firestore rules files.
- For exploit-style probing, drive authenticated requests with a minted custom token (README §3) as two
  different uids and try to cross the boundary.

## Deliverable

A PR (or report, if no code changed) with a **findings table**: severity (crit/high/med/low) · area ·
file:line · what · fix-or-filed. Launch-gating items also get flagged in `RELEASE_PLAN.md` §C. Apply only
the unambiguous hardening (e.g. add a missing `verifyToken`, tighten a MIME check); everything debatable
gets reported, not silently changed.
