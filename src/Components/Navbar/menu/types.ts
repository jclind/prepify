import { IconType } from 'react-icons'

/** Data every mobile-nav variant needs, produced once by `useNavMenu`. */
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

/** Props shared by all variant components. */
export type NavMenuVariantProps = NavMenuData & {
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
