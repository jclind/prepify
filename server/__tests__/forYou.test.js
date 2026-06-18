const {
  MIN_SIGNAL,
  buildTasteProfile,
  interactionWeight,
  tasteScore,
  qualityScore,
  scoreRecipe,
  selectForYou,
  shuffle,
  weightedSample,
} = require('../util/forYou')

// Hand-build a profile (the same shape buildTasteProfile returns) so scoring
// tests control affinities exactly.
const profileOf = ({ cuisine = {}, meal = {}, diet = {} }) => {
  const toMap = (o) => new Map(Object.entries(o))
  const maxPos = (o) => Object.values(o).reduce((m, v) => (v > m ? v : m), 0)
  return {
    cuisine: toMap(cuisine),
    meal: toMap(meal),
    diet: toMap(diet),
    max: { cuisine: maxPos(cuisine), meal: maxPos(meal), diet: maxPos(diet) },
  }
}

describe('interactionWeight', () => {
  it('sums made + saved + rating signals for one recipe', () => {
    // made(3) + saved(2) + rated-5(3) = 8
    expect(interactionWeight({ made: true, saved: true, rating: 5 })).toBe(8)
  })

  it('weights made above saved', () => {
    expect(interactionWeight({ made: true })).toBeGreaterThan(
      interactionWeight({ saved: true })
    )
  })

  it('is negative for a low rating (avoid signal)', () => {
    expect(interactionWeight({ rating: 1 })).toBeLessThan(0)
    expect(interactionWeight({ rating: 2 })).toBeLessThan(0)
  })

  it('is neutral (0) for a 3-star rating', () => {
    expect(interactionWeight({ rating: 3 })).toBe(0)
  })

  it('ignores a null/absent rating', () => {
    expect(interactionWeight({ saved: true, rating: null })).toBe(2)
  })
})

describe('buildTasteProfile', () => {
  it('accumulates weighted affinity per feature dimension', () => {
    const profile = buildTasteProfile([
      { recipe: { cuisine: 'Italian', mealTypes: ['dinner'], nutritionLabels: ['vegan'] }, weight: 3 },
      { recipe: { cuisine: 'Italian', mealTypes: ['lunch'], nutritionLabels: [] }, weight: 2 },
      { recipe: { cuisine: 'Thai', mealTypes: ['dinner'], nutritionLabels: [] }, weight: -2 },
    ])
    expect(profile.cuisine.get('Italian')).toBe(5)
    expect(profile.cuisine.get('Thai')).toBe(-2)
    expect(profile.meal.get('dinner')).toBe(1) // 3 + (-2)
    expect(profile.meal.get('lunch')).toBe(2)
    expect(profile.diet.get('vegan')).toBe(3)
    // max tracks the largest positive affinity per dimension (for normalization)
    expect(profile.max.cuisine).toBe(5)
    expect(profile.max.meal).toBe(2)
  })

  it('skips empty feature values', () => {
    const profile = buildTasteProfile([
      { recipe: { cuisine: '', mealTypes: [], nutritionLabels: [] }, weight: 3 },
    ])
    expect(profile.cuisine.size).toBe(0)
  })

  it('skips zero-weight interactions (e.g. a lone 3-star rating)', () => {
    // weight 0 contributes nothing — a recipe whose only signal is a neutral
    // 3-star rating must not register any affinity.
    const profile = buildTasteProfile([
      { recipe: { cuisine: 'Italian', mealTypes: ['dinner'], nutritionLabels: [] }, weight: 0 },
    ])
    expect(profile.cuisine.size).toBe(0)
    expect(profile.meal.size).toBe(0)
  })

  it('tolerates a missing/null recipe in an interaction', () => {
    const profile = buildTasteProfile([
      { recipe: null, weight: 3 },
      { recipe: { cuisine: 'Italian', mealTypes: [], nutritionLabels: [] }, weight: 2 },
    ])
    expect(profile.cuisine.get('Italian')).toBe(2)
  })

  it('returns empty maps and zero maxes for no interactions', () => {
    const profile = buildTasteProfile([])
    expect(profile.cuisine.size).toBe(0)
    expect(profile.max).toEqual({ cuisine: 0, meal: 0, diet: 0 })
  })
})

describe('tasteScore', () => {
  const profile = profileOf({
    cuisine: { Italian: 4, Thai: -2 },
    meal: { dinner: 2 },
    diet: { vegan: 2 },
  })

  it('is positive for a recipe matching a liked feature', () => {
    // signed(4,4) === 1
    expect(tasteScore({ cuisine: 'Italian', mealTypes: [], nutritionLabels: [] }, profile)).toBe(1)
  })

  it('is negative for a disliked feature', () => {
    // signed(-2,4) === -0.5
    expect(tasteScore({ cuisine: 'Thai', mealTypes: [], nutritionLabels: [] }, profile)).toBe(-0.5)
  })

  it('is exactly 0 for an unknown recipe (no affinity in any dimension)', () => {
    expect(tasteScore({ cuisine: 'French', mealTypes: [], nutritionLabels: [] }, profile)).toBe(0)
  })

  it('sums the three dimensions equally (balanced)', () => {
    // cuisine 1 + meal 1 + diet 1 === 3
    expect(
      tasteScore({ cuisine: 'Italian', mealTypes: ['dinner'], nutritionLabels: ['vegan'] }, profile)
    ).toBe(3)
  })

  it('averages affinity across a multi-valued dimension', () => {
    // mealTypes [dinner(2), lunch(0)] → mean 1 → signed(1,2) === 0.5
    expect(
      tasteScore({ cuisine: 'French', mealTypes: ['dinner', 'lunch'], nutritionLabels: [] }, profile)
    ).toBe(0.5)
  })

  it('ignores a dimension the profile has no positive signal in', () => {
    // profile has no meal/diet signal → only cuisine contributes
    const cuisineOnly = profileOf({ cuisine: { Italian: 3 } })
    expect(
      tasteScore({ cuisine: 'Italian', mealTypes: ['dinner'], nutritionLabels: ['vegan'] }, cuisineOnly)
    ).toBe(1)
  })
})

describe('qualityScore', () => {
  it('is 0 with no rating and no saves', () => {
    expect(qualityScore({}, 10)).toBe(0)
  })

  it('scales with average star rating (half the weight)', () => {
    // 0.5 * (5/5) + 0.5 * 0 === 0.5
    expect(qualityScore({ rating: { rateValue: 5 } }, 0)).toBe(0.5)
  })

  it('normalizes save popularity against the catalog max (half the weight)', () => {
    // 0.5 * 0 + 0.5 * (10/10) === 0.5
    expect(qualityScore({ numTimesSaved: 10 }, 10)).toBe(0.5)
  })

  it('guards against a zero catalog max (no division by zero)', () => {
    // numTimesSavedMax 0 → savePop contributes 0 regardless of numTimesSaved
    expect(qualityScore({ numTimesSaved: 99 }, 0)).toBe(0)
  })

  it('blends rating and save popularity', () => {
    // 0.5 * (4/5) + 0.5 * (5/10) === 0.4 + 0.25 === 0.65
    expect(qualityScore({ rating: { rateValue: 4 }, numTimesSaved: 5 }, 10)).toBeCloseTo(0.65)
  })
})

describe('scoreRecipe', () => {
  const profile = profileOf({ cuisine: { Italian: 4, Thai: -2 }, meal: { dinner: 2 } })

  it('scores a matching recipe positively', () => {
    const score = scoreRecipe({ cuisine: 'Italian', mealTypes: ['dinner'] }, profile)
    expect(score).toBeGreaterThan(0)
  })

  it('drives a disliked cuisine below zero', () => {
    const score = scoreRecipe({ cuisine: 'Thai', mealTypes: [] }, profile)
    expect(score).toBeLessThan(0)
  })

  it('gives an unknown recipe ~zero taste (only quality nudge)', () => {
    const score = scoreRecipe(
      { cuisine: 'French', mealTypes: [], nutritionLabels: [] },
      profile
    )
    expect(score).toBe(0)
  })

  it('adds a small quality tie-breaker from rating + save popularity', () => {
    const plain = scoreRecipe({ cuisine: 'Italian', mealTypes: ['dinner'] }, profile)
    const loved = scoreRecipe(
      { cuisine: 'Italian', mealTypes: ['dinner'], rating: { rateValue: 5 }, numTimesSaved: 10 },
      profile,
      10
    )
    expect(loved).toBeGreaterThan(plain)
  })
})

describe('selectForYou', () => {
  const profile = profileOf({ cuisine: { Italian: 3, Mexican: 3, Thai: -3 } })
  const r = (id, cuisine) => ({ _id: id, cuisine, mealTypes: [], nutritionLabels: [] })

  it('drops candidates with no positive taste match', () => {
    const out = selectForYou(
      [r('a', 'Italian'), r('b', 'Thai'), r('c', 'French')],
      profile,
      { rng: () => 0 }
    )
    const ids = out.map((x) => x._id)
    expect(ids).toContain('a')
    expect(ids).not.toContain('b') // disliked
    expect(ids).not.toContain('c') // unknown → score 0
  })

  it('excludes a popular off-taste recipe despite its positive blended score', () => {
    // The crux of the taste-vs-quality gate: a French recipe the user has no
    // affinity for (taste 0) still has score = QUALITY_WEIGHT * quality > 0 once
    // it carries a community rating + saves. It must NOT surface — quality is a
    // tie-breaker among on-taste recipes, never an entry ticket on its own.
    const lovedButOffTaste = {
      _id: 'french-hit',
      cuisine: 'French',
      mealTypes: [],
      nutritionLabels: [],
      rating: { rateValue: 5 },
      numTimesSaved: 100,
    }
    const onTastePlain = r('it', 'Italian')
    const out = selectForYou([lovedButOffTaste, onTastePlain], profile, {
      numTimesSavedMax: 100,
      rng: () => 0,
    })
    const ids = out.map((x) => x._id)
    expect(ids).toEqual(['it'])
    expect(ids).not.toContain('french-hit')
  })

  it('excludes a disliked-cuisine recipe even when it is community-loved', () => {
    const dislikedButLoved = {
      _id: 'thai-hit',
      cuisine: 'Thai', // profile affinity -3
      mealTypes: [],
      nutritionLabels: [],
      rating: { rateValue: 5 },
      numTimesSaved: 100,
    }
    const out = selectForYou([dislikedButLoved, r('it', 'Italian')], profile, {
      numTimesSavedMax: 100,
      rng: () => 0,
    })
    expect(out.map((x) => x._id)).toEqual(['it'])
  })

  it('uses quality to break ties among equally on-taste recipes', () => {
    // Three equally on-taste recipes (taste identical); quality orders them. With
    // limit 1 the relevant tier is the top 2 by blended score, so the lowest-
    // quality one falls outside it and can never surface — whatever the shuffle
    // draws. (The final slot is shuffled "fresh each visit", so we assert the
    // exclusion, not which of the top two wins.)
    const q = (id, rateValue, saves) => ({
      _id: id,
      cuisine: 'Mexican', // affinity +3, distinct from the Italian seeds below
      mealTypes: [],
      nutritionLabels: [],
      rating: { rateValue },
      numTimesSaved: saves,
    })
    const loved = q('loved', 5, 50)
    const mid = q('mid', 4, 20)
    const weak = q('weak', 1, 0)
    for (const rng of [() => 0, () => 0.4, () => 0.99]) {
      const out = selectForYou([weak, mid, loved], profile, {
        limit: 1,
        numTimesSavedMax: 50,
        rng,
      })
      expect(out).toHaveLength(1)
      expect(out[0]._id).not.toBe('weak')
    }
  })

  it('caps at 2 recipes per cuisine for diversity', () => {
    const candidates = [
      r('i1', 'Italian'), r('i2', 'Italian'), r('i3', 'Italian'), r('i4', 'Italian'),
      r('m1', 'Mexican'),
    ]
    const out = selectForYou(candidates, profile, { limit: 10, rng: () => 0 })
    const italian = out.filter((x) => x.cuisine === 'Italian')
    expect(italian).toHaveLength(2)
    expect(out.filter((x) => x.cuisine === 'Mexican')).toHaveLength(1)
  })

  it('respects the limit', () => {
    const candidates = [
      r('i1', 'Italian'), r('i2', 'Italian'),
      r('m1', 'Mexican'), r('m2', 'Mexican'),
    ]
    const out = selectForYou(candidates, profile, { limit: 2, rng: () => 0 })
    expect(out).toHaveLength(2)
  })

  it('is deterministic given a fixed rng', () => {
    const candidates = [r('i1', 'Italian'), r('i2', 'Italian'), r('m1', 'Mexican')]
    const a = selectForYou(candidates, profile, { rng: () => 0 }).map((x) => x._id)
    const b = selectForYou(candidates, profile, { rng: () => 0 }).map((x) => x._id)
    expect(a).toEqual(b)
  })
})

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, () => 0)
    expect(out.sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5]) // original untouched
  })
})

describe('MIN_SIGNAL', () => {
  it('is exported as a positive threshold', () => {
    expect(MIN_SIGNAL).toBeGreaterThan(0)
  })
})

describe('weightedSample', () => {
  const items = [
    { recipe: 'a', weight: 1 },
    { recipe: 'b', weight: 3 }, // 60% of total weight
    { recipe: 'c', weight: 1 },
  ]

  it('returns undefined for an empty list', () => {
    expect(weightedSample([])).toBeUndefined()
  })

  it('returns the only item when there is one', () => {
    expect(weightedSample([{ recipe: 'solo', weight: 5 }]).recipe).toBe('solo')
  })

  it('selects by cumulative weight (rng maps into each band)', () => {
    // total weight = 5, bands: a=[0,1), b=[1,4), c=[4,5).
    expect(weightedSample(items, () => 0).recipe).toBe('a') // r=0 → a
    expect(weightedSample(items, () => 0.5).recipe).toBe('b') // r=2.5 → b
    expect(weightedSample(items, () => 0.99).recipe).toBe('c') // r≈4.95 → c
  })

  it('never picks a zero-weight item when positive-weight items exist', () => {
    const mixed = [
      { recipe: 'zero', weight: 0 },
      { recipe: 'pos', weight: 2 },
    ]
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(weightedSample(mixed, () => r).recipe).toBe('pos')
    }
  })

  it('falls back to a uniform pick when all weights are zero', () => {
    const zeros = [
      { recipe: 'x', weight: 0 },
      { recipe: 'y', weight: 0 },
    ]
    expect(weightedSample(zeros, () => 0).recipe).toBe('x')
    expect(weightedSample(zeros, () => 0.99).recipe).toBe('y')
  })

  it('treats negative/missing weights as zero', () => {
    const items2 = [
      { recipe: 'neg', weight: -5 },
      { recipe: 'none' },
      { recipe: 'real', weight: 4 },
    ]
    for (const r of [0, 0.5, 0.99]) {
      expect(weightedSample(items2, () => r).recipe).toBe('real')
    }
  })
})
