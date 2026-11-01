# GLM-NOTES

Tests from a GLM pass on branch `glm/tests`, based on `origin/development`
at 1875282. The pass was cut short: first by z.ai's 5-hour cap, then by the
GLM Coding Plan expiring (2026-09-28 22:54). GLM never reached `server/` and
never wrote these notes; Claude wrote them from what it left.

## Added

13 files in `src/test/`, 58 tests, frontend only:
capitalize, formatPrice, formatCompactCount, timeElapsedSince, defaultAvatar,
ErrorWithData, useDebounce, useDelayedLoading, useScrolled, useIsMobile,
useBodyScrollLock, useAchievementsToast, useOwnRating.

Frontend suite: `Tests 826 passed | 2 skipped (828)`, up from 768 passed.
No application source changed. Server suite untouched (957 passed).

## Checked and changed by Claude, 2026-09-28

- Deleted GLM's throwaway helpers `glm-scratch.test.tsx` and
  `glm-verify-vitest.sh`.
- defaultAvatar golden test: GLM left `PLACEHOLDER`. Filled with today's value
  for 'jesse' (wheat, #EDE9FE, #7C3AED), so a hash or palette change fails it.
- defaultAvatar fallback: dropped the whitespace-only case. `getDefaultAvatar('   ')`
  trims to '' and gets 'apple', not the '?' avatar, because the `|| '?'`
  runs before `.trim()` (src/util/defaultAvatar.ts). Harmless while usernames
  can't be blank.
- useOwnRating: dropped the optimistic-update test. Its `waitFor('0')` matches
  the initial state before the check-made query resolves, so the query result
  lands after the click and resets the stars. The same race could hit a user
  who taps a star before their review loads; not confirmed in the browser.

## Not covered

server/, pages and larger components, API modules. A later pass can pick up
from here.

## Second review by Claude, 2026-10-01

A review agent checked every test against intent, not current output. Changes:

- timeElapsedSince: the tests asserted "1 minutes ago" and friends, locking in
  a grammar bug. Fixed the source to use the singular for 1, and fixed the
  dead `if (!oldDate)` guard (a Date is always truthy) to `isNaN`, so `''`
  returns 'invalid date' instead of "NaN years ago". `''` is reachable: the
  server stores `ratingLastUpdated: ''` on review-only docs and UserRatings
  renders it.
- formatCompactCount: about 9,951 to 9,999 rendered "10.0k". Now "10k", tested.
- useOwnRating: the zero-seed test passed before the query ran (initial state
  is already 0). It now seeds 3, refetches a doc without a usable rating, and
  waits for the second query. Added tests that a successful save invalidates
  `['recipe', id]` and `['check-made', id]`, and that a stale success does not.
- useAchievementsToast: the failed-ack test had no assertion. It now checks
  one toast and no refetch; a new test checks the refetch after a good ack.
- useScrolled: every test set both scrollTop values and fired on window, so
  the body-only path and the capture listener were untested. Added one that
  sets only body.scrollTop and fires on body.
- Comment fixes in formatPrice and ErrorWithData tests that described callers
  that don't exist.

Frontend GLM files: 67 pass. In this worktree PublicProfile, Recipes and
RecipesApi fail with auth/invalid-api-key because it has no `.env`; they pass
in the main checkout.
