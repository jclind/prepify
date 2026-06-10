import { NavMenuData } from 'src/Components/Navbar/menu/types'

/**
 * Props the desktop bar receives. Auth/profile come from `useNavMenu`;
 * `scrolled`/`darkNavLinks` drive the scroll-aware transparent→solid surface.
 */
export type DesktopNavProps = NavMenuData & {
  darkNavLinks: boolean
  scrolled: boolean
}
