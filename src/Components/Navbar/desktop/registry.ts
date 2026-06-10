import { DesktopVariant } from './types'

/**
 * The desktop nav design catalog (round 2) — distinct visual skins, all sharing
 * the same content/IA (prominent search · Recipes · Create · Saved · account
 * menu). Order here is the order shown in the dev switcher. Each entry maps to a
 * `.dnav--<id>` skin in DesktopNav.scss. The first-round skins are archived in
 * DesktopNav.archive.scss.
 *
 * Temporary exploration set: once a winner is picked, the switcher and the
 * unused variants get deleted and the chosen design is promoted.
 */
export const DESKTOP_VARIANTS: DesktopVariant[] = [
  // Refined — built on everything locked in (search-first, Create, Saved, condense).
  { id: 'editorial', label: 'Editorial', group: 'Refined' },
  { id: 'warm-soft', label: 'Warm Soft', group: 'Refined' },
  { id: 'tabbed', label: 'Tabbed', group: 'Refined' },
  { id: 'command', label: 'Command Bar', group: 'Refined' },
  { id: 'split-rail', label: 'Split Rail', group: 'Refined' },

  // "How would Apple design a recipe navbar" — restraint, translucency, air.
  { id: 'apple-clear', label: 'Apple Clear', group: 'Apple-inspired' },
  { id: 'apple-mono', label: 'Apple Mono', group: 'Apple-inspired' },

  // "How would a consistency-obsessed minimalist design it" — one system.
  { id: 'unified', label: 'Unified Pills', group: 'Consistency' },
  { id: 'grid', label: 'Grid Aligned', group: 'Consistency' },
  { id: 'quiet', label: 'Quiet', group: 'Consistency' },
]

export const DEFAULT_VARIANT_ID = DESKTOP_VARIANTS[0].id

/** Resolve a (possibly stale/unknown) id to a real variant; falls back to the first. */
export const getVariant = (id: string | null | undefined): DesktopVariant =>
  DESKTOP_VARIANTS.find(v => v.id === id) ?? DESKTOP_VARIANTS[0]
