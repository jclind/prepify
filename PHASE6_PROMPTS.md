# Phase 6 — Polish: Claude Code Prompts

**Rules (same as all phases):**
- Plan-and-pause before executing. Show the plan, wait for approval, then act.
- No feature work — behavior identical before/after each change.
- One focused commit per sub-phase.
- Flag anything unexpected in `REFACTOR_NOTES.md` without acting on it.

Each sub-phase is a standalone prompt — paste one at a time into Claude Code.

---

## Phase 6-A — CLAUDE.md & Env Var Documentation

```
Read REFACTOR.md Phase 6 known items, then read CLAUDE.md.

Plan only — do not edit yet.

Produce a diff-style plan for the following changes to CLAUDE.md:
1. Replace every `REACT_APP_*` environment variable reference with its correct `VITE_*` equivalent. The mapping is:
   - REACT_APP_FIREBASE_* → VITE_FIREBASE_*
   - REACT_APP_API_URL → VITE_API_URL
   - Any other REACT_APP_ prefix → VITE_ prefix
2. Find `VITE_OPEN_AI_API_KEY` in the codebase (grep src/ and .env.example if present). If the key is defined but has zero callers in src/, add a note in CLAUDE.md marking it as "defined but unused — remove before production or wire to a feature." If it does have callers, document it normally.
3. Ensure the env var table (or list) in CLAUDE.md is complete: it should cover all vars in both root .env (frontend Firebase vars) and server/.env (MONGO_URI, PORT, FIREBASE_SERVICE_ACCOUNT).
4. Fix any other obviously stale content (CRA references like `react-scripts`, `npm start` pointing to wrong port, etc.) — flag each change in the plan.

Do not touch any source files. Show the full plan, then stop.
```

---

## Phase 6-B — manifest.json & sitemap Cleanup

```
Read REFACTOR.md Phase 6 known items.

Plan only — do not edit yet.

1. Read public/manifest.json. List every field that still contains Create React App boilerplate (e.g. "React App", default icon references, incorrect theme/background colors, placeholder description).
2. Read public/sitemap.txt. Determine whether it has mixed domains or placeholder content. If it does, the plan should delete it — a sitemap.txt with wrong domains is worse than no sitemap. If we delete it, note that a proper sitemap.xml should be added as a Phase 6 follow-up or post-launch task (do NOT create one now).
3. For manifest.json, propose concrete replacement values for each boilerplate field:
   - name: "Prepify"
   - short_name: "Prepify"
   - description: one sentence describing the app
   - theme_color / background_color: match the app's primary color if findable in src/ CSS vars or Tailwind config; otherwise use a sensible neutral and flag for designer review
   - icons: leave unchanged unless they are explicitly the CRA default (logo192.png / logo512.png with no Prepify equivalents) — if so, update the manifest to note icon replacement is needed but do not delete the references
4. Show the full plan, then stop.
```

---

## Phase 6-C — Double Ampersand Bug in checkUsernameAvailability

```
Read REFACTOR.md Phase 6 known items.

Plan only — do not edit yet.

1. Find `checkUsernameAvailability` in src/. Read its full implementation.
2. Identify the `?&username=` double-ampersand bug (a spurious `&` immediately after the `?`). Show the exact current line and the corrected line.
3. Check whether this function has a corresponding test. If yes, verify the test would catch this bug (it should assert the URL shape or at least exercise the call). If no test exists, add a note in the plan that a unit test should be added — but do not write it now unless the function already has a test file.
4. Confirm no other API utility functions in src/api/ have the same pattern (grep for `?&`).
5. Show the full plan, then stop.
```

---

## Phase 6-D — CORS Header Cleanup in nutrition Axios Instance

```
Read REFACTOR.md Phase 6 known items.

Plan only — do not edit yet.

1. Find the `nutrition` axios instance in src/api/http-common.ts (or wherever it lives).
2. Show the current headers config. CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Headers, etc.) are response headers — setting them on the client request object is a no-op and misleading. Plan to remove them from the axios defaultHeaders / instance config.
3. Verify the nutrition API calls still work conceptually without these headers: the browser will still send the request; CORS is enforced by the server's response. Note this in the plan.
4. While in http-common.ts, clean up any stale comments that reference CORS incorrectly (e.g. "setting CORS headers" on a client config).
5. Show the full plan, then stop.
```

---

## Phase 6-E — getUsername Post-Signup Race Condition

```
Read REFACTOR_NOTES.md (look for the getUsername race condition entry) and REFACTOR.md Phase 6.

Plan only — do not edit yet.

Context: After signup, the app calls getUsername which hits the server before setUsername has finished writing the user doc to MongoDB. This results in two 404 responses before the username resolves. The behavior is pre-existing and was logged in REFACTOR_NOTES.md during Phase 5.

1. Find the signup flow: AuthContext or wherever setUsername / getUsername are called post-registration.
2. Find the getUsername server route. Show what it returns when no user doc exists (likely a 404 or null).
3. Propose ONE of these fixes (pick whichever requires fewer moving parts):
   a. Retry with backoff on the client: if getUsername returns 404/null, wait 500ms and retry up to 3 times before giving up.
   b. Return a default/empty username from the server if the doc doesn't exist yet, and let the client handle the "no username" state it already handles elsewhere.
   c. Sequence the calls: await setUsername fully before calling getUsername (if the current code fires them in parallel or doesn't await).
4. Show which option you're recommending and why, then show the exact change needed. Do not edit yet.
5. Show the full plan, then stop.
```

---

## Phase 6-F — TrendingRecipes Always-False Loading Condition

```
Read REFACTOR_NOTES.md (Phase 2-E-1 entry for TrendingRecipes always-false loading class condition).

Plan only — do not edit yet.

1. Read src/Components/TrendingRecipes/TrendingRecipes.tsx.
2. Find the condition `recipes.length < 0` on the className toggle. This is always false — no array can have negative length.
3. Determine the correct intent: the class should be 'loading' when recipes haven't loaded yet (empty array before fetch resolves) and absent once recipes are populated. The correct condition is `recipes.length === 0`.
   - But check: after fetch completes with zero results, `recipes.length === 0` would still show 'loading'. Determine if there's a separate loading state variable. If yes, use that. If no, the condition fix is still `recipes.length === 0` and the edge case is a pre-existing UX gap (log it in REFACTOR_NOTES.md, don't over-engineer).
4. Check whether TrendingRecipes has a test that covers the className. If yes, the test will need to be updated. If no, note it.
5. Show the full plan, then stop.
```

---

## Phase 6-G — POST /api/ingredients/parse Auth Guard

```
Read REFACTOR_NOTES.md (Phase 2-E-2 entry for unauthenticated route).

Plan only — do not edit yet.

Context: POST /api/ingredients/parse is the only server route without verifyToken middleware. This was flagged as an inconsistency during Phase 2 testing. Every other route requires a Firebase Bearer token.

1. Read server/routes/ingredients.js (or wherever this route lives). Show its current middleware chain.
2. Determine whether there is a legitimate reason for this route to be public (e.g., used from an unauthenticated context in the UI). Check src/ for all callers of this endpoint.
3. If all callers are from authenticated contexts (i.e., the user is logged in when the call is made), plan to add verifyToken as the first middleware on this route.
4. If the route is intentionally public, plan to add a comment documenting this decision so future readers don't flag it.
5. Check whether the ingredient parse test in server/__tests__/ingredients.test.js will need updating (it currently documents the auth-gap behavior as current).
6. Show the full plan, then stop.
```

---

## Phase 6-H — saveRecipe / unsaveRecipe HTTP Method Standardization

```
Read REFACTOR.md decision log and Phase 5 notes regarding saveRecipe/unsaveRecipe verb deferral.

Plan only — do not edit yet.

Context: saveRecipe and unsaveRecipe still use PUT. During Phase 5-E, review/rating mutations were standardized to POST/DELETE, but save/unsave was explicitly deferred because it is a different concern (toggling a saved state, not a review mutation).

Decision needed before planning:
- saveRecipe (saving a recipe to a user's list) → should become POST /api/recipes/:id/save
- unsaveRecipe (removing it) → should become DELETE /api/recipes/:id/save (or /unsave)

1. Find saveRecipe and unsaveRecipe in src/api/recipes.ts. Show current method and URL.
2. Find the server routes that handle these. Show current method and path.
3. Propose the new methods and paths following REST conventions. The client call and server route must match.
4. Identify all UI call sites (components that call saveRecipe/unsaveRecipe) — these don't need changes since the API function abstracts the method, but list them for awareness.
5. Check whether server tests cover these routes and will need updating.
6. Show the full plan, then stop.
```

---

## Phase 6-I — Final Verification & Commit

```
All Phase 6 sub-phases are complete. Run the full verification suite and produce a commit.

1. Run: tsc --noEmit
   - There must be zero errors. If any exist, fix them before proceeding.

2. Run: npm test -- --run (frontend Vitest)
   - All tests must pass. If any fail due to Phase 6 changes, fix them.

3. Run: npm test --prefix server (Jest)
   - All tests must pass.

4. Run: npm run build
   - Build must succeed with no errors.

5. If all checks pass, produce a single commit:
   git add -A
   git commit -m "refactor(phase-6): polish — docs, bug fixes, CORS cleanup, auth guard, HTTP method standardization"

6. Update REFACTOR.md:
   - Change Phase 6 status from 🔲 Not started to ✅ Complete
   - Add Completed date and commit hash
   - Update "Last updated" date at the top

7. Print a summary of every file changed across all Phase 6 sub-phases.
```

---

## Notes

- Sub-phases 6-A through 6-H are independent and can be run in any order, but run 6-I last.
- If any sub-phase uncovers something unexpected, log it in `REFACTOR_NOTES.md` and continue — don't let one finding block the rest.
- The `uploadRecipeImage` unique filename fix (listed in REFACTOR.md Phase 6) is **not included** here because it depends on the Cloudinary migration (deferred from Phase 5). That fix should be paired with the Cloudinary implementation, not done in isolation against the current broken image upload flow.
- Cypress e2e should be run locally before Phase 6-I if not already confirmed green after Phase 5.
