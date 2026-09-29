import { describe, it, expect } from 'vitest'
import { formatPrice } from 'src/util/formatPrice'

// formatPrice renders stored cents as a dollar string. It must always produce
// two decimals (so columns of prices align) and round fractional cents rather
// than truncate them.
describe('formatPrice', () => {
  it('renders cents as dollars with two decimals', () => {
    expect(formatPrice(1234)).toBe('$12.34')
    expect(formatPrice(1099)).toBe('$10.99')
    expect(formatPrice(100)).toBe('$1.00')
    expect(formatPrice(5)).toBe('$0.05')
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('rounds fractional cents to the nearest cent', () => {
    // Serving-price math can produce fractional cents (sum / servings).
    // 10/3 cents = $0.0333… → down; 5/3 cents = $0.0166… → up.
    expect(formatPrice(10 / 3)).toBe('$0.03')
    expect(formatPrice(5 / 3)).toBe('$0.02')
  })
})
