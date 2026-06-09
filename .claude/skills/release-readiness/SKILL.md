---
name: release-readiness
description: Audit Prepify against its beta→1.0 release checklist and update status markers in docs/RELEASE_PLAN.md. Use for "release readiness", "what's left before launch", "am I ready to ship", "check the release plan", "beta to release status".
---

# Release Readiness Audit

Audits the Prepify codebase against `docs/RELEASE_PLAN.md`, updates each item's status marker
based on what's actually true in the repo right now, and reports the highest-priority remaining work.

This skill is **read-only against app code** — the only file it writes is `docs/RELEASE_PLAN.md`
(status markers + an audit-log entry). It never edits source, env files, or config.

All paths are relative to the repo root.

## Procedure

### 1. Load the plan

Read `docs/RELEASE_PLAN.md`. If it doesn't exist, tell the user to create it first (it's the source
of truth) and stop. Otherwise, parse the checklist items under each section so you know what to verify.

### 2. Run the concrete checks

For each checklist item, run the matching read-only check below and decide a status:
`[x]` done · `[~]` partial/gap · `[ ]` todo · `[?]` needs a decision. Prefer evidence over assumption —
if a check is ambiguous, mark `[~]` and note why.

**Beta tag / blockers**
- `grep -rn -iE "isBeta|-beta" src` — any hit means the beta tag is still live → blockers stay `[ ]`.
  Zero hits → mark the three beta-removal items `[x]`.
- `grep -n "RELEASE_DATE" src/Components/ReleaseNotes/ReleaseNotes.tsx` — if it still reads
  `3/31/2023` (or any clearly stale date), the release-notes item stays `[~]`.

**Section A — Product / UX**
- Dev tooling in prod: `grep -rn "ReactQueryDevtools" src` and check it's gated behind
  `import.meta.env.DEV` (or not rendered in prod). Ungated → `[~]`.
- 404 route: `grep -rn -iE "path=\"\\*\"|NotFound|404" src` — presence of a catch-all route → likely `[x]`.
- Release-notes external link: confirm the GitHub releases URL in `ReleaseNotes.tsx` is current.
- Empty/error states, mobile, copy: these need a human pass — leave as `[ ]`/`[~]` and remind the user
  they're manual, unless the user says they've done them.

**Section B — Security & secrets**
- `grep -rn "VITE_OPEN_AI_API_KEY\|VITE_INGREDIENT_PARSER_URL" .env.example src` — still present in
  `.env.example` or referenced → dead-secret item stays `[ ]`. Absent everywhere → `[x]`.
- For every `VITE_` var in `.env.example`, `grep -rn "<VAR_NAME>" src` to see if it's actually used;
  flag unused ones.
- CORS: read `FRONTEND_URLS` handling in `server/` (grep `FRONTEND_URLS`) — note if it could fall back
  to permissive/localhost values.
- Input validation / rate limiting: scan `server/routes/*.js` for body validation and any rate-limit
  middleware. Absent → `[ ]`/`[~]`.
- Dep audit: run `npm audit --omit=dev` at root and in `server/`; record high/critical counts.

**Section C — Launch & legal**
- Privacy / Terms: `grep -rn -iE "privacy|terms" src/pages src/Components` and check for routes →
  absent → `[ ]`.
- SEO: check for `public/robots.txt` and `public/sitemap.xml`; `grep -rn "Helmet" src` for per-page
  titles.
- README placeholders: `grep -n "your-username" README.md`.

> Use `grep`/Glob/Read only. The single allowed mutation is editing `docs/RELEASE_PLAN.md`.
> `npm audit` is fine (read-only). Do **not** run installs, builds, or `npm audit fix`.

### 3. Update the plan

Edit `docs/RELEASE_PLAN.md` in place: set each item's marker to the status you determined. Don't
rewrite the prose or reorder items — only change the `[ ]`/`[~]`/`[x]`/`[?]` markers (and append a
short parenthetical note to an item if a check revealed something specific, e.g. "(npm audit: 2 high)").

Then append a dated entry under the **Audit log** section at the bottom:

```
### <today's date> — audit run
- Blockers remaining: <count> (<one-line summary>)
- Changes since last run: <what flipped status, or "none">
- Highlights: <e.g. "beta tag still live in 3 files; 1 high-sev dep advisory">
```

### 4. Report

End your response with a short, prioritized **Next 3 things** list — the highest-leverage items still
blocking 1.0, each with the file(s) to touch. Keep it scannable; the detail lives in the plan file.

## Notes

- Be conservative: only mark `[x]` when a check positively confirms it. Manual-only items
  (mobile pass, copy review, empty states) should stay `[ ]`/`[~]` unless the user explicitly confirms
  they're done.
- If the user passes a section name as an argument (e.g. `/release-readiness security`), audit only
  that section.
