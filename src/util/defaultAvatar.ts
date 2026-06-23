// Deterministic "fun" default avatar for users who haven't set a photo: a food
// emoji on a soft pastel tile, picked from a stable hash of the user's seed
// (their username) so the same user always gets the same avatar everywhere.

const EMOJIS = [
  '🍳', '🥑', '🍅', '🥕', '🍜', '🧁', '🍓', '🥦',
  '🌽', '🍕', '🌮', '🍣', '🍩', '🥐', '🍇', '🍰',
  '🍝', '🫐', '🥗', '🍋', '🍑', '🥥', '🌶️', '🍔',
]

// Light, friendly backgrounds so the emoji stays the focal point.
const BACKGROUNDS = [
  '#FFE0B2', '#FFCCBC', '#F8BBD0', '#E1BEE7',
  '#C5CAE9', '#B3E5FC', '#B2DFDB', '#C8E6C9',
  '#DCEDC8', '#FFF59D', '#FFE082', '#D7CCC8',
]

// Small, stable string hash (FNV-ish). Deterministic across sessions/devices.
const hashSeed = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

export type DefaultAvatarStyle = { emoji: string; bg: string }

/**
 * Resolve a deterministic emoji + background for a seed (e.g. a username).
 * Emoji and background are picked from independent slices of the hash so two
 * users with the same emoji usually differ in colour.
 */
export const getDefaultAvatar = (seed: string | null | undefined): DefaultAvatarStyle => {
  const s = (seed || '?').trim().toLowerCase()
  const h = hashSeed(s)
  return {
    emoji: EMOJIS[h % EMOJIS.length],
    bg: BACKGROUNDS[Math.floor(h / EMOJIS.length) % BACKGROUNDS.length],
  }
}
