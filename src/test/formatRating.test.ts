import { describe, it, expect } from 'vitest'
import { formatRating } from 'src/util/formatRating'

// formatRating turns a raw average + count into the string shown next to the
// stars across the app (cards, hero, account). It guards the "no ratings yet"
// case and otherwise rounds to one decimal.
describe('formatRating', () => {
  it('returns "No Ratings" when there is no average or no count', () => {
    expect(formatRating(0, 5)).toBe('No Ratings')
    expect(formatRating(4.3, 0)).toBe('No Ratings')
    expect(formatRating(0, 0)).toBe('No Ratings')
  })

  it('rounds to one decimal place', () => {
    expect(formatRating(4.27, 3)).toBe('4.3')
    expect(formatRating(4.24, 3)).toBe('4.2')
  })

  it('always shows one decimal, even for whole-number averages', () => {
    expect(formatRating(5, 10)).toBe('5.0')
    expect(formatRating(3, 1)).toBe('3.0')
  })
})
