const {
  normalize,
  levenshtein,
  ratio,
  titleScore,
  fuzzyRankTitles,
  toTextSearch,
  FUZZY_THRESHOLD,
} = require('../util/recipeTitleMatch')

describe('normalize', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalize('  Tuscan   Chicken  ')).toBe('tuscan chicken')
  })
  it('coerces null/undefined to empty string', () => {
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
  })
})

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('chicken', 'chicken')).toBe(0)
  })
  it('counts single-edit typos as distance 1', () => {
    expect(levenshtein('chickn', 'chicken')).toBe(1) // deletion
    expect(levenshtein('chickem', 'chicken')).toBe(1) // substitution
  })
  it('handles empty operands', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })
})

describe('ratio', () => {
  it('is 1 for identical strings and 0..1 otherwise', () => {
    expect(ratio('chicken', 'chicken')).toBe(1)
    expect(ratio('chikcen', 'chicken')).toBeGreaterThan(0.5)
    expect(ratio('chikcen', 'chicken')).toBeLessThan(1)
  })
})

describe('titleScore', () => {
  it('scores an exact substring as 1', () => {
    expect(titleScore('chicken', 'Tuscan Chicken Skillet')).toBe(1)
    expect(titleScore('CHICK', 'Tuscan Chicken Skillet')).toBe(1) // case-insensitive
  })

  it('surfaces a single-character typo above threshold', () => {
    expect(titleScore('chikcen', 'Tuscan Chicken Skillet')).toBeGreaterThanOrEqual(
      FUZZY_THRESHOLD
    )
    expect(titleScore('spagetti', 'Spaghetti Bolognese')).toBeGreaterThanOrEqual(
      FUZZY_THRESHOLD
    )
  })

  it('keeps unrelated titles below threshold (no noise)', () => {
    expect(titleScore('apple', 'Banana Bread')).toBeLessThan(FUZZY_THRESHOLD)
    expect(titleScore('pizza', 'Caesar Salad')).toBeLessThan(FUZZY_THRESHOLD)
  })

  it('handles a multi-word typo query', () => {
    expect(
      titleScore('chiken skillet', 'Tuscan Chicken Skillet')
    ).toBeGreaterThanOrEqual(FUZZY_THRESHOLD)
  })

  it('returns 0 for empty input', () => {
    expect(titleScore('', 'Chicken')).toBe(0)
    expect(titleScore('chicken', '')).toBe(0)
  })
})

describe('fuzzyRankTitles', () => {
  const candidates = [
    { _id: '1', title: 'Tuscan Chicken Skillet' },
    { _id: '2', title: 'One-Pan Mediterranean Chicken' },
    { _id: '3', title: 'Banana Bread' },
    { _id: '4', title: 'Apple Crumble' },
  ]

  it('returns near-misses sorted best-first with a _score', () => {
    const ranked = fuzzyRankTitles('chikcen', candidates)
    const titles = ranked.map((r) => r.title)
    expect(titles).toContain('Tuscan Chicken Skillet')
    expect(titles).toContain('One-Pan Mediterranean Chicken')
    expect(titles).not.toContain('Banana Bread')
    // monotonically non-increasing scores
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]._score).toBeGreaterThanOrEqual(ranked[i]._score)
    }
  })

  it('respects the limit', () => {
    const ranked = fuzzyRankTitles('chikcen', candidates, { limit: 1 })
    expect(ranked).toHaveLength(1)
    expect(ranked[0].title).toBe('Tuscan Chicken Skillet')
  })

  it('returns [] for an empty query', () => {
    expect(fuzzyRankTitles('', candidates)).toEqual([])
  })

  it('returns [] when nothing clears the threshold', () => {
    expect(fuzzyRankTitles('zzzqwerty', candidates)).toEqual([])
  })
})

describe('toTextSearch', () => {
  it('lowercases and collapses to an OR-of-terms string', () => {
    expect(toTextSearch('  Chicken   Soup ')).toBe('chicken soup')
  })

  it('strips leading dashes so a term is never negated', () => {
    // Raw "-apple" would negate apple in a $text query; sanitized it just searches it.
    expect(toTextSearch('-apple')).toBe('apple')
    expect(toTextSearch('soup -chicken')).toBe('soup chicken')
  })

  it('strips double quotes so nothing forces phrase mode', () => {
    expect(toTextSearch('"apple pie"')).toBe('apple pie')
  })

  it('returns empty string when nothing searchable remains', () => {
    expect(toTextSearch('')).toBe('')
    expect(toTextSearch('  ')).toBe('')
    expect(toTextSearch('"')).toBe('')
    expect(toTextSearch('-')).toBe('')
  })
})
