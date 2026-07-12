import {
  ACCOUNT_SAVED_RECIPES_PATH,
  ACCOUNT_YOUR_RECIPES_PATH,
  RECIPES_PATH,
} from 'src/routes'

// ---------------------------------------------------------------------------
// Shared footer content — single source of truth for the footer's links, blurb,
// socials, and version. Keeping it data-driven keeps the Footer components thin.
// ---------------------------------------------------------------------------

export const version = import.meta.env.VITE_APP_VERSION
export const contactEmail = 'JesseLindCS@gmail.com'
export const longTagline =
  'Real recipes with the prices and nutrition baked in. Plan, shop and cook with zero guesswork.'

export type FooterLink = {
  label: string
  to: string
  external?: boolean
  /** Auth visibility: 'in' = only signed in, 'out' = only signed out, omit = always. */
  auth?: 'in' | 'out'
}
export type FooterColumn = { heading: string; links: FooterLink[] }

/** Primary nav columns. Links marked `external: true` render as a plain <a>
 *  (e.g. the `mailto:` Contact link) instead of a router <Link>. */
export const footerColumns: FooterColumn[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'Home', to: '/' },
      { label: 'All recipes', to: RECIPES_PATH },
      // Add a recipe is behind PrivateRoute — only show it to signed-in users so
      // logged-out visitors aren't bounced to the login wall from the footer.
      { label: 'Add a recipe', to: '/add-recipe', auth: 'in' },
      // Help/support is public (route lives outside PrivateRoute) so locked-out
      // users — forgot password, broken signup — can always reach the form.
      { label: 'Help', to: '/help' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Log in', to: '/login', auth: 'out' },
      { label: 'Sign up', to: '/signup', auth: 'out' },
      { label: 'My recipes', to: ACCOUNT_YOUR_RECIPES_PATH, auth: 'in' },
      { label: 'Saved recipes', to: ACCOUNT_SAVED_RECIPES_PATH, auth: 'in' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: `mailto:${contactEmail}`, external: true },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
]

export const currentYear = new Date().getFullYear()
