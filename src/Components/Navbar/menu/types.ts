import { IconType } from 'src/Components/icons'

/** Auth/profile data the mobile nav menu needs, produced once by `useNavMenu`. */
export type NavMenuData = {
  isLoggedIn: boolean
  authLoading: boolean
  username: string
  email: string
  photoURL: string | null
  logout: () => void
}

/** Props for the mobile nav menu: profile data plus open/close control. */
export type NavMenuProps = NavMenuData & {
  open: boolean
  onClose: () => void
}

export type NavItem = {
  label: string
  to: string
  icon: IconType
}

export type NavGroup = {
  heading: string
  items: NavItem[]
}
