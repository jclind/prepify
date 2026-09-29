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
