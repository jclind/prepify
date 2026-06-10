import { FC } from 'react'
import {
  C01,
  C02,
  C03,
  C04,
  C05,
  C06,
  C07,
  C08,
  C09,
  C10,
} from './takes/Conservative'
import {
  X01,
  X02,
  X03,
  X04,
  X05,
  X06,
  X07,
  X08,
  X09,
  X10,
} from './takes/Creative'
import { G01, G02, G03, G04, G05, G06 } from './takes/PolishedControls'

export type Take = {
  id: string
  label: string
  group: 'Polished Grid · controls' | 'Conservative' | 'Creative'
  /** One-line description of the concept, shown in the switcher. */
  blurb: string
  Component: FC
}

/**
 * The 20 /recipes redesign takes. `Conservative` = polish & refine the current
 * grid/filter/load-more pattern; `Creative` = branch into new browse layouts.
 * Rendered live via the floating switcher (dev only).
 */
export const TAKES: Take[] = [
  // ---- Polished Grid: control treatments (round 2, focused on the winner) ----
  { id: 'g01', label: 'G01 · Popover Pills', group: 'Polished Grid · controls', blurb: 'Quiet filter pills, each opens a popover', Component: G01 },
  { id: 'g02', label: 'G02 · Command Bar', group: 'Polished Grid · controls', blurb: 'Search + filters + sort in one bar (no 2nd search)', Component: G02 },
  { id: 'g03', label: 'G03 · Category Chips', group: 'Polished Grid · controls', blurb: 'One-tap quick chips, sort tucked right', Component: G03 },
  { id: 'g04', label: 'G04 · Quiet Rail', group: 'Polished Grid · controls', blurb: 'Understated persistent left facets', Component: G04 },
  { id: 'g05', label: 'G05 · Minimal + Drawer', group: 'Polished Grid · controls', blurb: 'Bare toolbar, full filters in a slide-in sheet', Component: G05 },
  { id: 'g06', label: 'G06 · G05 + 1-star rating', group: 'Polished Grid · controls', blurb: 'Same as G05 but compact single-star rating', Component: G06 },
  // ---- Conservative ----
  { id: 'c01', label: 'C01 · Polished Grid', group: 'Conservative', blurb: 'Home-style cards + result count', Component: C01 },
  { id: 'c02', label: 'C02 · Filter Chips', group: 'Conservative', blurb: 'Removable active-filter chips + clear all', Component: C02 },
  { id: 'c03', label: 'C03 · Sidebar Filters', group: 'Conservative', blurb: 'Left filter rail + grid', Component: C03 },
  { id: 'c04', label: 'C04 · Segmented Sort', group: 'Conservative', blurb: 'Quick-sort segmented control + count', Component: C04 },
  { id: 'c05', label: 'C05 · Category Chips', group: 'Conservative', blurb: 'Scrollable meal/cuisine chip rail', Component: C05 },
  { id: 'c06', label: 'C06 · Compact Dense', group: 'Conservative', blurb: 'Smaller cards, more per row', Component: C06 },
  { id: 'c07', label: 'C07 · Tagged Cards', group: 'Conservative', blurb: 'Cuisine + diet pills on each card', Component: C07 },
  { id: 'c08', label: 'C08 · Sticky Filters', group: 'Conservative', blurb: 'Filter bar sticks under the nav', Component: C08 },
  { id: 'c09', label: 'C09 · Budget-forward', group: 'Conservative', blurb: 'Price-per-serving as the hero stat', Component: C09 },
  { id: 'c10', label: 'C10 · Editorial Header', group: 'Conservative', blurb: 'Centered hero intro + refined grid', Component: C10 },
  // ---- Creative ----
  { id: 'x01', label: 'X01 · Magazine', group: 'Creative', blurb: 'Featured-first asymmetric grid', Component: X01 },
  { id: 'x02', label: 'X02 · List View', group: 'Creative', blurb: 'Scannable rows + grid/list toggle', Component: X02 },
  { id: 'x03', label: 'X03 · Masonry', group: 'Creative', blurb: 'Pinterest-style variable heights', Component: X03 },
  { id: 'x04', label: 'X04 · Hero Spotlight', group: 'Creative', blurb: 'Recipe-of-the-week banner + grid', Component: X04 },
  { id: 'x05', label: 'X05 · Dark Gourmet', group: 'Creative', blurb: 'Moody dark theme, gold accents', Component: X05 },
  { id: 'x06', label: 'X06 · Filter Drawer', group: 'Creative', blurb: 'Airbnb-style slide-in filter panel', Component: X06 },
  { id: 'x07', label: 'X07 · Faceted Rail', group: 'Creative', blurb: 'Sidebar facets with live counts', Component: X07 },
  { id: 'x08', label: 'X08 · Immersive', group: 'Creative', blurb: 'Full-bleed image cards w/ overlay text', Component: X08 },
  { id: 'x09', label: 'X09 · Collections', group: 'Creative', blurb: 'Curated tabs (Quick, Budget, Vegan…)', Component: X09 },
  { id: 'x10', label: 'X10 · Bento Tiles', group: 'Creative', blurb: 'Mixed big/small image tiles', Component: X10 },
]

export const getTake = (id: string): Take | undefined =>
  TAKES.find(t => t.id === id)
