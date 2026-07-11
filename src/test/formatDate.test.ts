import { describe, it, expect } from 'vitest'
import { formatDate } from 'src/util/formatDate'

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Mirrors formatDate's own rendering so assertions stay correct regardless of
// the runner's local timezone, while still pinning the string contract.
const expectedLabel = (date: Date, short: boolean): string => {
  const month = short
    ? monthNames[date.getMonth()].substring(0, 3)
    : monthNames[date.getMonth()]
  return `${month} ${date.getDate()}, ${date.getFullYear()}`
}

// formatDate's real contract is an epoch-ms string (see `createdAt` /
// `reviewCreatedAt`, produced via `Date.now().toString()` — RecipeAPI.addRecipe,
// server/routes/reviews.js). The guard used to be `Number.isNaN(d) ? new
// Date(d) : new Date(Number(d))`, but `Number.isNaN` never coerces its input,
// so `Number.isNaN(<any string>)` is always false — every string, including a
// genuine ISO string, took the `new Date(Number(d))` branch and rendered
// "Invalid Date" for ISO input. The fix coerces first (`Number(d)`) and
// branches on whether *that* is NaN, falling back to `new Date(d)` only for
// non-numeric strings.
describe('formatDate', () => {
  it('renders an epoch-ms string (the real contract) correctly, long form', () => {
    const ms = 1700000000000
    expect(formatDate(String(ms), false)).toBe(expectedLabel(new Date(ms), false))
  })

  it('renders an epoch-ms string correctly, short form', () => {
    const ms = 1700000000000
    expect(formatDate(String(ms), true)).toBe(expectedLabel(new Date(ms), true))
  })

  it('renders a Date.now()-style epoch-ms string (reviewCreatedAt/createdAt shape)', () => {
    const ms = Date.now()
    const epochMsString = ms.toString()
    expect(formatDate(epochMsString, false)).toBe(expectedLabel(new Date(ms), false))
    expect(formatDate(epochMsString, true)).toBe(expectedLabel(new Date(ms), true))
  })

  it('parses a genuine ISO date string instead of rendering Invalid Date (regression)', () => {
    const iso = '2023-11-14T12:00:00.000Z'
    const result = formatDate(iso, false)
    // Before the fix: Number('2023-11-14T12:00:00.000Z') is NaN, but
    // Number.isNaN(iso) (no coercion) is false, so the old guard took the
    // `new Date(Number(iso))` branch -> new Date(NaN) -> Invalid Date ->
    // rendered as "undefined NaN, NaN".
    expect(result).not.toBe('undefined NaN, NaN')
    expect(result).not.toContain('NaN')
    expect(result).not.toContain('undefined')
    expect(result).toBe(expectedLabel(new Date(iso), false))
  })

  it('parses a genuine ISO date string in short form', () => {
    const iso = '2023-11-14T12:00:00.000Z'
    expect(formatDate(iso, true)).toBe(expectedLabel(new Date(iso), true))
  })
})
