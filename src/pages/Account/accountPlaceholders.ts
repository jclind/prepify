// ──────────────────────────────────────────────────────────────────────────
// Account page — placeholder data.
//
// The redesigned account header shows profile fields and a light gamification
// layer (level / XP / rewards) that DO NOT have a backend yet. To ship the new
// look now without faking it in the markup, every not-yet-real value lives here
// in one clearly-labelled place. Each block is tagged with the phase that will
// replace it with a real API, so the swap is a one-liner per feature.
//
// IMPORTANT: nothing here is real user data. The /account page is private (only
// the signed-in user sees their own), so placeholder level/counts are only ever
// shown to the person they describe.
//
// Phase 2 (DONE) wired bio + location to a real API (AuthAPI.getProfile), so
// their placeholders were removed from here. Level/XP and tab counts remain.
// ──────────────────────────────────────────────────────────────────────────

// TODO(Phase 4 — XP/level engine): replace with the gamification API
// (level + rank + XP-to-next, derived from saves / reviews / publishes / cooks).
export type AccountLevel = {
  level: number
  rank: string
  xp: number
  xpNext: number
  pct: number // progress to next level, 0–100
}
export const levelPlaceholder: AccountLevel = {
  level: 7,
  rank: 'Seasoned Cook',
  xp: 1280,
  xpNext: 2000,
  pct: 64,
}

// TODO(Phase 3 — aggregate counts): replace with a real counts endpoint (or the
// per-tab `totalCount` already returned by each sub-page query). The segmented
// nav hides a count entirely when its value is null, so wiring a real number is
// a drop-in. These placeholder values keep the approved "counts in the nav" look
// intact until then.
export type AccountTabCounts = {
  saved: number | null
  ratings: number | null
  recipes: number | null
  drafts: number | null
}
export const tabCountsPlaceholder: AccountTabCounts = {
  saved: 48,
  ratings: 23,
  recipes: 12,
  drafts: 3,
}
