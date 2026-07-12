// Deterministic default avatar for users with no photo: a food line-icon in a
// darker shade on a light tint of the same hue (a tasteful, near-monochrome
// look). Both the icon and the hue are picked from a stable hash of the user's
// seed (their username) so the same user always gets the same avatar everywhere.

// Icon keys map to react-icons/lu (Lucide) components in DefaultAvatar.tsx.
export const AVATAR_ICONS = [
  'apple', 'carrot', 'croissant', 'cookie', 'pizza', 'soup',
  'salad', 'egg', 'fish', 'beef', 'cakeSlice', 'coffee',
  'iceCream', 'cherry', 'grape', 'sandwich', 'donut', 'cookingPot',
  'wheat', 'candy',
] as const

export type AvatarIcon = (typeof AVATAR_ICONS)[number]

// Light tint (background) + darker same-hue shade (icon), one hue per entry.
const HUES: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#FFF1E6', fg: '#EA580C' }, // orange
  { bg: '#FEF3C7', fg: '#D97706' }, // amber
  { bg: '#FFE4E6', fg: '#E11D48' }, // rose
  { bg: '#E0F2FE', fg: '#0284C7' }, // blue
  { bg: '#EDE9FE', fg: '#7C3AED' }, // violet
  { bg: '#CCFBF1', fg: '#0D9488' }, // teal
  { bg: '#DCFCE7', fg: '#16A34A' }, // green
  { bg: '#FCE7F3', fg: '#DB2777' }, // pink
  { bg: '#E0E7FF', fg: '#4F46E5' }, // indigo
  { bg: '#CFFAFE', fg: '#0891B2' }, // cyan
]

// Small, stable string hash (FNV-ish). Deterministic across sessions/devices.
const hashSeed = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

export type DefaultAvatarStyle = { icon: AvatarIcon; bg: string; fg: string }

/**
 * Resolve a deterministic icon + hue for a seed (e.g. a username). Icon and hue
 * are taken from independent slices of the hash so two users with the same icon
 * usually differ in colour.
 */
export const getDefaultAvatar = (
  seed: string | null | undefined
): DefaultAvatarStyle => {
  const s = (seed || '?').trim().toLowerCase()
  const h = hashSeed(s)
  const { bg, fg } = HUES[Math.floor(h / AVATAR_ICONS.length) % HUES.length]
  return { icon: AVATAR_ICONS[h % AVATAR_ICONS.length], bg, fg }
}
