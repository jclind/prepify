import { FC } from 'react'
import V01 from './variants/Variant01'
import V02 from './variants/Variant02'
import V03 from './variants/Variant03'
import V04 from './variants/Variant04'
import V05 from './variants/Variant05'
import V06 from './variants/Variant06'
import V07 from './variants/Variant07'
import V08 from './variants/Variant08'
import V09 from './variants/Variant09'
import V10 from './variants/Variant10'
import V11 from './variants/Variant11'
import V12 from './variants/Variant12'
import V13 from './variants/Variant13'
import V14 from './variants/Variant14'
import V15 from './variants/Variant15'
import V16 from './variants/Variant16'
import V17 from './variants/Variant17'
import V18 from './variants/Variant18'
import V19 from './variants/Variant19'
import V20 from './variants/Variant20'
import R01 from './round2/R01'
import R02 from './round2/R02'
import R03 from './round2/R03'
import R04 from './round2/R04'
import R05 from './round2/R05'
import R06 from './round2/R06'
import R07 from './round2/R07'
import R08 from './round2/R08'
import R09 from './round2/R09'
import R10 from './round2/R10'
import T01 from './round3/T01'
import T02 from './round3/T02'
import T03 from './round3/T03'
import T04 from './round3/T04'
import T05 from './round3/T05'
import Q01 from './round4/Q01'
import Q02 from './round4/Q02'
import Q03 from './round4/Q03'
import Q04 from './round4/Q04'
import Q05 from './round4/Q05'
import P01 from './round5/P01'
import P02 from './round5/P02'
import P03 from './round5/P03'

export type VariantGroup =
  | 'Round 5 · Tightened'
  | 'Round 4 · Level + XP'
  | 'Round 3 · Soft Segmented'
  | 'Round 2 — Refined'
  | 'Round 1 · Conservative'
  | 'Round 1 · Creative'

export type VariantMeta = {
  id: number
  name: string
  blurb: string
  group: VariantGroup
  Component: FC
}

// Order here == switcher order == index. `id` is the global 1-based position.
// Round 2 is listed first so the switcher opens on the refined set.
export const variants: VariantMeta[] = [
  // ── Round 5 · Tightened (Q4 content, fewer bands, recipes higher) ──────────
  { id: 1, name: 'Left identity', blurb: 'Left-aligned identity, controls top-right, meta as one line. XP card below.', group: 'Round 5 · Tightened', Component: P01 },
  { id: 2, name: 'Two-column header', blurb: 'Identity left, XP card + controls in a panel right — one tight band.', group: 'Round 5 · Tightened', Component: P02 },
  { id: 3, name: 'Slim cover band', blurb: 'Warm band carries avatar + name + controls; meta, bio, XP card below.', group: 'Round 5 · Tightened', Component: P03 },

  // ── Round 4 · Level + XP (refines T2: action cluster + rewards) ────────────
  { id: 4, name: 'Rewards + icons', blurb: 'XP bar + Rewards pill; subtle outline Edit, icon Settings & Share.', group: 'Round 4 · Level + XP', Component: Q01 },
  { id: 5, name: 'Segmented actions', blurb: 'Edit · Settings · Share as one control; XP bar + "View rewards" link.', group: 'Round 4 · Level + XP', Component: Q02 },
  { id: 6, name: 'Icon trio', blurb: 'Quietest: icon-only Edit/Settings/Share; XP bar + a trophy icon.', group: 'Round 4 · Level + XP', Component: Q03 },
  { id: 7, name: 'XP card', blurb: 'Level + XP + rewards combined into one tappable card; subtle actions.', group: 'Round 4 · Level + XP', Component: Q04 },
  { id: 8, name: 'Momentum + share', blurb: '"+120 XP this week" chip, a labeled Share, and a "⋯ More" overflow.', group: 'Round 4 · Level + XP', Component: Q05 },

  // ── Round 3 · Soft Segmented (R1 base, smaller avatar, no stat tiles,
  //    quiet level/XP + achievements) ────────────────────────────────────────
  { id: 9, name: 'XP Ring', blurb: 'Level baked into the avatar progress ring + a small rank chip.', group: 'Round 3 · Soft Segmented', Component: T01 },
  { id: 10, name: 'Level + XP bar', blurb: 'Rank chip by the name and a slim XP-to-next bar. Two quiet lines.', group: 'Round 3 · Soft Segmented', Component: T02 },
  { id: 11, name: 'Earned badges row', blurb: 'XP-ring avatar + a tidy row of earned badge glyphs with a "+N".', group: 'Round 3 · Soft Segmented', Component: T03 },
  { id: 12, name: 'Level + next-up', blurb: 'Rank chip plus a single "Next: …" nudge toward the closest badge.', group: 'Round 3 · Soft Segmented', Component: T04 },
  { id: 13, name: 'Quiet status line', blurb: 'One slim strip: rank · earned badges · next-up, above the tabs.', group: 'Round 3 · Soft Segmented', Component: T05 },

  // ── Round 2 — Refined (honed from the user's round-1 favourites) ──────────
  { id: 14, name: 'Soft Segmented', blurb: 'V9 soft identity + stat tiles + V10 segmented control + search.', group: 'Round 2 — Refined', Component: R01 },
  { id: 15, name: 'Soft Pills', blurb: 'Closest to V9: soft identity, stat tiles, friendly pill tabs.', group: 'Round 2 — Refined', Component: R02 },
  { id: 16, name: 'Clean Segmented', blurb: 'Minimal flat header, compact inline stats, bio, segmented.', group: 'Round 2 — Refined', Component: R03 },
  { id: 17, name: 'Soft + Achievements', blurb: 'Soft identity, stat tiles, a subtle achievements strip, segmented.', group: 'Round 2 — Refined', Component: R04 },
  { id: 18, name: 'Side Profile', blurb: 'Asymmetric: identity + bio left, stat tiles right, segmented.', group: 'Round 2 — Refined', Component: R05 },
  { id: 19, name: 'Gradient Band', blurb: 'Softened V16 gradient band with glass stats; segmented below.', group: 'Round 2 — Refined', Component: R06 },
  { id: 20, name: 'Search-First', blurb: 'Compact identity; V20 search promoted to a hero over the grid.', group: 'Round 2 — Refined', Component: R07 },
  { id: 21, name: 'Pills + Achievements', blurb: 'V9 pills, stat tiles and the subtle achievements strip together.', group: 'Round 2 — Refined', Component: R08 },
  { id: 22, name: 'Bio + Stats Cards', blurb: 'Two-card masthead: an About/bio card beside a stats card.', group: 'Round 2 — Refined', Component: R09 },
  { id: 23, name: 'The Full Blend', blurb: 'Every liked piece, calm: identity, bio, stats, achievements, search.', group: 'Round 2 — Refined', Component: R10 },

  // ── Round 1 · Conservative ────────────────────────────────────────────────
  { id: 24, name: 'Classic Clean', blurb: 'Centered identity + pill tabs with counts. The safe gold standard.', group: 'Round 1 · Conservative', Component: V01 },
  { id: 25, name: 'Sidebar Dashboard', blurb: 'Left nav rail with icons + counts, content pane on the right.', group: 'Round 1 · Conservative', Component: V02 },
  { id: 26, name: 'Cover Banner', blurb: 'Cover photo, overlapping avatar, stat tiles, underline tabs.', group: 'Round 1 · Conservative', Component: V03 },
  { id: 27, name: 'Card Stack', blurb: 'Distinct white cards: profile, stats, tabbed content.', group: 'Round 1 · Conservative', Component: V04 },
  { id: 28, name: 'Minimal Editorial', blurb: 'Whitespace-forward, large display name, thin divider tabs.', group: 'Round 1 · Conservative', Component: V05 },
  { id: 29, name: 'Stat-Forward', blurb: 'Big stat tiles as the hero; numbers lead the page.', group: 'Round 1 · Conservative', Component: V06 },
  { id: 30, name: 'Compact Toolbar', blurb: 'Dense header + sticky tab toolbar. App-like and efficient.', group: 'Round 1 · Conservative', Component: V07 },
  { id: 31, name: 'Two-Column Profile', blurb: 'Sticky profile rail on the left, tabbed content on the right.', group: 'Round 1 · Conservative', Component: V08 },
  { id: 32, name: 'Soft & Rounded', blurb: 'Friendly pills, warm chips, gentle shadows. Approachable.', group: 'Round 1 · Conservative', Component: V09 },
  { id: 33, name: 'Segmented Control', blurb: 'iOS-style segmented tabs under a clean, centered header.', group: 'Round 1 · Conservative', Component: V10 },

  // ── Round 1 · Creative ────────────────────────────────────────────────────
  { id: 34, name: 'Collections Board', blurb: 'Saved recipes organized into collection boards you tap into.', group: 'Round 1 · Creative', Component: V11 },
  { id: 35, name: 'Cooking Dashboard', blurb: 'Streaks, money saved, made count, weekly cook chart.', group: 'Round 1 · Creative', Component: V12 },
  { id: 36, name: 'Public Profile', blurb: 'Viewer-facing profile with follow + a public/edit toggle.', group: 'Round 1 · Creative', Component: V13 },
  { id: 37, name: 'Achievements', blurb: 'Badge wall, levels, and milestone progress bars.', group: 'Round 1 · Creative', Component: V14 },
  { id: 38, name: 'Taste Insights', blurb: 'Top cuisines/diets charts + a "made for you" strip.', group: 'Round 1 · Creative', Component: V15 },
  { id: 39, name: 'Gradient Hero', blurb: 'Full-bleed gradient identity with glassy stat cards.', group: 'Round 1 · Creative', Component: V16 },
  { id: 40, name: 'Magazine Feature', blurb: 'Editorial spread: featured save, masthead name, pull quotes.', group: 'Round 1 · Creative', Component: V17 },
  { id: 41, name: 'Activity Timeline', blurb: 'Chronological feed of saves, reviews, cooks, and badges.', group: 'Round 1 · Creative', Component: V18 },
  { id: 42, name: 'Bento Grid', blurb: 'Asymmetric bento of profile, stats, collections, taste.', group: 'Round 1 · Creative', Component: V19 },
  { id: 43, name: 'Power Cook', blurb: 'Dark, dense, command-bar driven for the power user.', group: 'Round 1 · Creative', Component: V20 },
]

// Distinct groups, in registry order — used to build the switcher's optgroups.
export const variantGroups: VariantGroup[] = variants.reduce<VariantGroup[]>((acc, v) => {
  if (!acc.includes(v.group)) acc.push(v.group)
  return acc
}, [])
