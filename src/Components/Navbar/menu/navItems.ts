import { HelpIcon, HomeIcon, PlusCircleIcon, RecipesMenuIcon, UserIcon } from 'src/Components/icons'
import { NavItem, NavGroup } from './types'
import { RECIPES_PATH } from 'src/routes'

/** Browse links — always shown (logged in or out). */
const browseItems: NavItem[] = [
  { label: 'Home', to: '/', icon: HomeIcon },
  { label: 'Recipes', to: RECIPES_PATH, icon: RecipesMenuIcon },
]

/** Create links — logged-in only. */
const createItems: NavItem[] = [
  { label: 'Create Recipe', to: '/add-recipe', icon: PlusCircleIcon },
]

/** Account links — logged-in only (Logout is rendered separately as a button). */
const accountNavItems: NavItem[] = [
  { label: 'Account', to: '/account', icon: UserIcon },
  { label: 'Help', to: '/help', icon: HelpIcon },
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
