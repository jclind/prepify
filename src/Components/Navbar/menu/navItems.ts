import { AiOutlineHome, AiOutlineUser, AiOutlinePlusCircle } from 'react-icons/ai'
import { MdOutlineRestaurantMenu } from 'react-icons/md'
import { BiHelpCircle } from 'react-icons/bi'
import { NavItem, NavGroup } from './types'

/** Browse links — always shown (logged in or out). */
export const browseItems: NavItem[] = [
  { label: 'Home', to: '/', icon: AiOutlineHome },
  { label: 'Recipes', to: '/recipes', icon: MdOutlineRestaurantMenu },
]

/** Create links — logged-in only. */
export const createItems: NavItem[] = [
  { label: 'Create Recipe', to: '/add-recipe', icon: AiOutlinePlusCircle },
]

/** Account links — logged-in only (Logout is rendered separately as a button). */
export const accountNavItems: NavItem[] = [
  { label: 'Account', to: '/account', icon: AiOutlineUser },
  { label: 'Help', to: '/help', icon: BiHelpCircle },
]

/** Sectioned list rendered by the menu (Browse / Create / Account). */
export const getNavGroups = (isLoggedIn: boolean): NavGroup[] => {
  if (!isLoggedIn) return [{ heading: 'Browse', items: browseItems }]
  return [
    { heading: 'Browse', items: browseItems },
    { heading: 'Create', items: createItems },
    { heading: 'Account', items: accountNavItems },
  ]
}
