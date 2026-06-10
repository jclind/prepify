// Gamification engine — derives a user's level, rank, XP progress, and earned
// achievements purely from their account counts (saved / ratings / recipes /
// drafts). Nothing here is stored; the caller passes in the user's already-seen
// achievement ids only so we can report which unlocks are NEW (for the toast).
//
// Everything tunable lives in this top block — tweak weights/curve/copy here.

// XP awarded per item. Drafts intentionally earn nothing (work-in-progress).
const XP_WEIGHTS = {
  recipes: 100,
  ratings: 15,
  saved: 5,
}

// Cumulative XP required to REACH a level: cumXp(L) = LEVEL_STEP * (L-1) * L.
// → L1:0  L2:100  L3:300  L4:600  L5:1000  L6:1500  L7:2100 …
// (the XP to clear a single level L is therefore LEVEL_STEP * 2 * L.)
const LEVEL_STEP = 50

// Rank tiers by level — the highest tier whose minLevel is met wins.
const RANKS = [
  { minLevel: 1, name: 'New Cook' },
  { minLevel: 3, name: 'Home Cook' },
  { minLevel: 5, name: 'Seasoned Cook' },
  { minLevel: 7, name: 'Chef' },
  { minLevel: 10, name: 'Master Chef' },
]

// Achievement definitions. `test(counts)` decides whether it is earned; the
// unlock toast shows `name`. Keep the copy short.
const ACHIEVEMENTS = [
  {
    id: 'first_save',
    name: 'First Save',
    description: 'Saved your first recipe.',
    test: c => c.saved >= 1,
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Saved 25 recipes.',
    test: c => c.saved >= 25,
  },
  {
    id: 'first_recipe',
    name: 'First Recipe',
    description: 'Published your first recipe.',
    test: c => c.recipes >= 1,
  },
  {
    id: 'prolific',
    name: 'Prolific Author',
    description: 'Published 10 recipes.',
    test: c => c.recipes >= 10,
  },
  {
    id: 'first_review',
    name: 'First Review',
    description: 'Left your first review.',
    test: c => c.ratings >= 1,
  },
  {
    id: 'critic',
    name: 'Critic',
    description: 'Left 10 reviews.',
    test: c => c.ratings >= 10,
  },
]

function cumXpForLevel(level) {
  return LEVEL_STEP * (level - 1) * level
}

function computeXp(counts) {
  return (
    (counts.recipes || 0) * XP_WEIGHTS.recipes +
    (counts.ratings || 0) * XP_WEIGHTS.ratings +
    (counts.saved || 0) * XP_WEIGHTS.saved
  )
}

// Level for a given XP total, plus progress within that level.
function levelFromXp(xp) {
  let level = 1
  while (cumXpForLevel(level + 1) <= xp) level++
  const base = cumXpForLevel(level)
  const next = cumXpForLevel(level + 1)
  const xpForNext = next - base
  const xpIntoLevel = xp - base
  const pct = xpForNext > 0 ? Math.round((xpIntoLevel / xpForNext) * 100) : 0
  return { level, xpIntoLevel, xpForNext, pct }
}

function rankForLevel(level) {
  let name = RANKS[0].name
  for (const r of RANKS) {
    if (level >= r.minLevel) name = r.name
  }
  return name
}

// Full gamification payload for the account header. `seen` is the user's stored
// list of already-acknowledged achievement ids; newlyUnlocked = earned − seen.
function computeGamification(counts, seen = []) {
  const xp = computeXp(counts)
  const { level, xpIntoLevel, xpForNext, pct } = levelFromXp(xp)
  const rank = rankForLevel(level)

  const achievements = ACHIEVEMENTS.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    earned: a.test(counts),
  }))
  const earned = achievements.filter(a => a.earned).map(a => a.id)
  const seenSet = new Set(seen)
  const newlyUnlocked = earned.filter(id => !seenSet.has(id))

  return {
    level,
    rank,
    xp: xpIntoLevel, // progress within the current level
    xpNext: xpForNext, // XP needed to clear the current level
    pct,
    totalXp: xp,
    achievements,
    earned,
    newlyUnlocked,
  }
}

module.exports = {
  computeGamification,
  computeXp,
  levelFromXp,
  rankForLevel,
  cumXpForLevel,
  ACHIEVEMENTS,
  XP_WEIGHTS,
}
