import { describe, it, expect } from 'vitest'
import { formatCompactCount } from 'src/util/formatCompactCount'

// formatCompactCount short-forms a count for tight UI (badges, metric tiles).
// The boundaries matter as much as the middles: the 10k switch to whole-k, and
// the guard that rolls 999,500 up to "1.0M" instead of "1000k".
describe('formatCompactCount', () => {
  it('renders small values and missing input as plain digits', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(7)).toBe('7')
    expect(formatCompactCount(999)).toBe('999')
    expect(formatCompactCount(undefined)).toBe('0')
  })

  it('renders 1k–9999 with one decimal k', () => {
    expect(formatCompactCount(1_000)).toBe('1.0k')
    expect(formatCompactCount(1_500)).toBe('1.5k')
    expect(formatCompactCount(9_400)).toBe('9.4k')
  })

  it('switches to whole-k from 10k up', () => {
    expect(formatCompactCount(10_000)).toBe('10k')
    expect(formatCompactCount(98_300)).toBe('98k')
    expect(formatCompactCount(999_000)).toBe('999k')
  })

  it('rounds to the nearest whole k, not truncating', () => {
    // 104,999/1000 = 104.999 → 105k
    expect(formatCompactCount(104_999)).toBe('105k')
  })

  it('rolls a k value that rounds to 1000 into megabytes instead of "1000k"', () => {
    // The boundary the code guards explicitly: 999,500 rounds to 1000k.
    expect(formatCompactCount(999_500)).toBe('1.0M')
  })

  it('renders millions with one decimal', () => {
    expect(formatCompactCount(1_284_000)).toBe('1.3M')
    expect(formatCompactCount(2_000_000)).toBe('2.0M')
  })
})
