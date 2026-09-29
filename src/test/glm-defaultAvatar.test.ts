import { describe, it, expect } from 'vitest'
import { getDefaultAvatar, AVATAR_ICONS } from 'src/util/defaultAvatar'

// getDefaultAvatar derives a user's placeholder avatar from a stable hash of
// their seed. The contract: same seed → same avatar everywhere, forever (a
// golden value pins the hash against accidental change), missing seeds fall
// back to the '?' avatar, and the picks actually spread across the palette
// rather than collapsing onto one icon.
describe('getDefaultAvatar', () => {
  it('is deterministic: the same seed resolves to the same style', () => {
    const a = getDefaultAvatar('jesse')
    const b = getDefaultAvatar('jesse')
    expect(a).toEqual(b)
  })

  it('golden value: pins the hash so existing avatars never change', () => {
    // If this fails, the hash or palette changed and every existing user's
    // avatar silently reshuffles — that's a real regression, not a test bug.
    expect(getDefaultAvatar('jesse')).toEqual({
      icon: 'wheat',
      bg: '#EDE9FE',
      fg: '#7C3AED',
    })
  })

  it('normalizes the seed: case and surrounding whitespace are irrelevant', () => {
    expect(getDefaultAvatar('Alphonso')).toEqual(getDefaultAvatar('alphonso'))
    expect(getDefaultAvatar('  alphonso  ')).toEqual(getDefaultAvatar('alphonso'))
  })

  it('falls back to the "?" avatar for null/undefined/empty seeds', () => {
    const fallback = getDefaultAvatar('?')
    expect(getDefaultAvatar(null)).toEqual(fallback)
    expect(getDefaultAvatar(undefined)).toEqual(fallback)
    expect(getDefaultAvatar('')).toEqual(fallback)
  })

  it('always returns a known icon and a light/dark hex pair', () => {
    for (const seed of ['a', 'ab', 'abc', 'sam-2', 'cook@example.com', 'żółć']) {
      const { icon, bg, fg } = getDefaultAvatar(seed)
      expect(AVATAR_ICONS).toContain(icon)
      expect(bg).toMatch(/^#[0-9A-F]{6}$/i)
      expect(fg).toMatch(/^#[0-9A-F]{6}$/i)
      expect(bg).not.toBe(fg)
    }
  })

  it('spreads distinct seeds across icons and hues instead of collapsing', () => {
    const icons = new Set<string>()
    const bgs = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const { icon, bg } = getDefaultAvatar(`user${i}`)
      icons.add(icon)
      bgs.add(bg)
    }
    // 60 seeds over 20 icons × 10 hues: anything near a single value means the
    // hash is degenerate.
    expect(icons.size).toBeGreaterThan(5)
    expect(bgs.size).toBeGreaterThan(3)
  })
})
