import { NavMenuData } from 'src/Components/Navbar/menu/types'

/**
 * One desktop nav design. The visual identity of each variant lives in
 * DesktopNav.scss (scoped to `.dnav--<id>` / `.nav[data-variant="<id>"]`); the
 * markup is shared via <DesktopBar>, so a variant is just config.
 *
 * Search is always present and prominent (locked IA decision), so it's no
 * longer a per-variant axis — `centerSearch` only tweaks its placement.
 */
export type DesktopVariant = {
  id: string
  label: string
  group: string
  /** Center the search in the bar instead of left-aligning it. */
  centerSearch?: boolean
}

/**
 * Props every desktop bar receives. Auth/profile come from `useNavMenu`;
 * `scrolled`/`darkNavLinks` drive the scroll-aware transparent→solid surface.
 */
export type DesktopNavProps = NavMenuData & {
  darkNavLinks: boolean
  scrolled: boolean
}
