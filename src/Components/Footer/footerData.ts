import { IconType } from 'react-icons'
import { FaInstagram, FaPinterestP, FaTiktok, FaYoutube } from 'react-icons/fa'
import pjson from '../../../package.json'

// ---------------------------------------------------------------------------
// Shared footer content — single source of truth for the footer's links, blurb,
// socials, and version. Keeping it data-driven keeps the Footer components thin.
// ---------------------------------------------------------------------------

export const version = pjson.version
export const contactEmail = 'JesseLindCS@gmail.com'
export const longTagline =
  'Real recipes with the prices and nutrition baked in — so you can plan, shop, and cook with zero guesswork.'

export type FooterLink = { label: string; to: string; external?: boolean }
export type FooterColumn = { heading: string; links: FooterLink[] }

/** Primary nav columns. Links marked `external: true` are placeholders ('#'). */
export const footerColumns: FooterColumn[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'All recipes', to: '/recipes' },
      { label: 'Trending', to: '/recipes' },
      { label: 'Add a recipe', to: '/add-recipe' },
      { label: 'Help', to: '/help' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
      { label: 'My recipes', to: '/account/your-recipes' },
      { label: 'Saved recipes', to: '/account/saved-recipes' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '#', external: true },
      { label: 'Contact', to: `mailto:${contactEmail}`, external: true },
      { label: 'Privacy', to: '#', external: true },
      { label: 'Terms', to: '#', external: true },
    ],
  },
]

export type SocialLink = { label: string; href: string; Icon: IconType }

/** Recipe-discovery platforms. Hrefs are '#' placeholders for now. */
export const socialLinks: SocialLink[] = [
  { label: 'Instagram', href: '#', Icon: FaInstagram },
  { label: 'Pinterest', href: '#', Icon: FaPinterestP },
  { label: 'TikTok', href: '#', Icon: FaTiktok },
  { label: 'YouTube', href: '#', Icon: FaYoutube },
]

export const currentYear = new Date().getFullYear()
