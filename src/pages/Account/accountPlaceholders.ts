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
// the signed-in user sees their own), so the placeholder level is only ever
// shown to the person it describes.
//
// Phase 2 wired bio + location (AuthAPI.getProfile) and Phase 3 wired the tab
// counts (RecipeAPI.getAccountCounts), so those placeholders were removed. Only
// the level/XP layer remains placeheld, until the Phase 4 gamification engine.
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
