import { describe, it, expect } from 'vitest'
import { timeElapsedSince } from 'src/util/timeElapsedSince'

// timeElapsedSince renders a review's timestamp as "N <unit> ago". Each band
// (seconds → minutes → hours → days → weeks → months → years) hands off at its
// boundary, and inputs arrive both as Date objects and as stored ISO strings.
// Dates are computed relative to Date.now() with mid-band offsets so a few ms
// of test-run drift can't change the floored unit.
describe('timeElapsedSince', () => {
  const ago = (ms: number) => new Date(Date.now() - ms)
  const SEC = 1000
  const MIN = 60 * SEC
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it('renders sub-minute ages in seconds', () => {
    expect(timeElapsedSince(ago(30 * SEC))).toBe('30 seconds ago')
  })

  it('renders minute ages until an hour', () => {
    expect(timeElapsedSince(ago(90 * SEC))).toBe('1 minutes ago')
    expect(timeElapsedSince(ago(23 * MIN))).toBe('23 minutes ago')
  })

  it('renders hour ages until a day', () => {
    expect(timeElapsedSince(ago(70 * MIN))).toBe('1 hours ago')
    expect(timeElapsedSince(ago(5 * HOUR))).toBe('5 hours ago')
  })

  it('renders day ages until a week', () => {
    expect(timeElapsedSince(ago(26 * HOUR))).toBe('1 days ago')
    expect(timeElapsedSince(ago(3 * DAY))).toBe('3 days ago')
  })

  it('renders week ages until a month', () => {
    expect(timeElapsedSince(ago(8 * DAY))).toBe('1 weeks ago')
    expect(timeElapsedSince(ago(20 * DAY))).toBe('2 weeks ago')
  })

  it('renders month ages until a year', () => {
    expect(timeElapsedSince(ago(40 * DAY))).toBe('1 months ago')
    expect(timeElapsedSince(ago(100 * DAY))).toBe('3 months ago')
  })

  it('renders year ages beyond 365 days', () => {
    expect(timeElapsedSince(ago(400 * DAY))).toBe('1 years ago')
  })

  it('accepts a stored ISO string as well as a Date', () => {
    expect(timeElapsedSince(new Date(Date.now() - 30 * SEC).toISOString())).toBe(
      '30 seconds ago'
    )
  })
})
