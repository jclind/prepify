import pjson from '../../../package.json'

// ---------------------------------------------------------------------------
// Shared footer content — single source of truth for the footer's links, blurb,
// socials, and version. Keeping it data-driven keeps the Footer components thin.
// ---------------------------------------------------------------------------

export const version = pjson.version
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
      { label: 'All recipes', to: '/recipes' },
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
      { label: 'Sign in', to: '/login', auth: 'out' },
      { label: 'Create account', to: '/signup', auth: 'out' },
      { label: 'My recipes', to: '/account/your-recipes', auth: 'in' },
      { label: 'Saved recipes', to: '/account/saved-recipes', auth: 'in' },
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
