import { IconType } from 'react-icons'

/** Auth/profile data the mobile nav menu needs, produced once by `useNavMenu`. */
export type NavMenuData = {
  isLoggedIn: boolean
  authLoading: boolean
  username: string
  email: string
  /** First letter of username (or email) for the avatar fallback. */
  nameInitial: string
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
