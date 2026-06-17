// Pure scoring helpers for the personalized "For You" home row.
//
// The home row is content-based: there are no stored diet/cuisine preferences
// (Settings "Cooking Preferences" is deferred), and the user base is too small
// for collaborative filtering to be reliable. So we infer a taste profile from
// the user's own behavior (saves / makes / ratings), then score unseen recipes
// by how well their categorical features (cuisine / mealTypes / nutritionLabels)
// overlap that profile, with community quality as a tie-breaker.
//
// Everything here is pure (no DB, no I/O) so it can be unit-tested directly and
// the route stays thin. The route is responsible for loading interactions and
// the candidate pool and passing them in.

// A user needs at least this many distinct interacted recipes before the row is
// shown at all (the "hide until personalized" decision). Below this the route
// returns [] and the frontend renders nothing.
const MIN_SIGNAL = 3

// How strongly each kind of interaction pushes a feature value. A single recipe
// can contribute via several signals (e.g. saved AND made AND rated) — those sum.
const WEIGHTS = {
  made: 3,
  saved: 2,
  rating: { 5: 3, 4: 2, 3: 0, 2: -2, 1: -2 },
}

// Final-score blend. Cuisine / meal / diet affinities are each normalized to
// 0..1 (see scoreRecipe) and summed equally ("balanced"); quality is a small
// additive tie-breaker so a well-loved recipe edges out an obscure one of equal
// taste-match, without overriding the personalization.
const QUALITY_WEIGHT = 0.25

// Diversity: at most this many recipes of any single cuisine in the final row.
const MAX_PER_CUISINE = 2

const ratingWeight = (rating) =>
  Object.prototype.hasOwnProperty.call(WEIGHTS.rating, rating)
    ? WEIGHTS.rating[rating]
    : 0

// Add `weight` to map[key], skipping empty keys.
function bump(map, key, weight) {
  if (key == null || key === '') return
  map.set(key, (map.get(key) || 0) + weight)
}

// Build a taste profile from the user's interactions.
//
// `interactions` is an array of { recipe, weight } where `recipe` is a feature
// doc ({ cuisine, mealTypes, nutritionLabels }) and `weight` is the combined
// signal weight for that recipe (made + saved + rating, already summed by the
// caller via interactionWeight()). Returns three Maps of value -> affinity plus
// the max positive affinity per dimension (used to normalize at score time).
function buildTasteProfile(interactions) {
  const cuisine = new Map()
  const meal = new Map()
  const diet = new Map()

  for (const { recipe, weight } of interactions) {
    if (!recipe || !weight) continue
    bump(cuisine, recipe.cuisine, weight)
    for (const m of recipe.mealTypes || []) bump(meal, m, weight)
    for (const d of recipe.nutritionLabels || []) bump(diet, d, weight)
  }

  const maxPos = (map) => {
    let max = 0
    for (const v of map.values()) if (v > max) max = v
    return max
  }

  return {
    cuisine,
    meal,
    diet,
    max: { cuisine: maxPos(cuisine), meal: maxPos(meal), diet: maxPos(diet) },
  }
}

// Combine a recipe's interaction signals into one weight for the profile.
// `signals` = { made: bool, saved: bool, rating: number|null }.
function interactionWeight({ made, saved, rating } = {}) {
  let w = 0
  if (made) w += WEIGHTS.made
  if (saved) w += WEIGHTS.saved
  if (rating != null) w += ratingWeight(rating)
  return w
}

// Signed normalization against the dimension's max positive affinity, so the
// three dimensions are comparable regardless of how many recipes the user has
// touched. Negatives are kept (not clamped): a value the user rated 1-star has
// a negative affinity and drags the score down, which is what we want.
const signed = (value, max) => (max > 0 ? value / max : 0)

// Mean affinity across a recipe's values in one (multi-valued) dimension.
const meanAffinity = (values, map) =>
  values.length ? values.reduce((s, v) => s + (map.get(v) || 0), 0) / values.length : 0

// Pure taste affinity: equal-weighted, signed, normalized affinity across the
// three dimensions ("balanced"). This is what decides whether a recipe belongs
// in the row at all — a value the user has positive affinity for pushes it up, a
// disliked one pushes it negative. A recipe the user has no signal on scores 0.
//
// Kept separate from quality so the row can gate strictly on taste: a popular
// recipe the user has no affinity for must NOT surface just because it's loved
// by the community (see selectForYou's filter).
function tasteScore(recipe, profile) {
  const cuisineRaw = profile.cuisine.get(recipe.cuisine) || 0
  const mealRaw = meanAffinity(recipe.mealTypes || [], profile.meal)
  const dietRaw = meanAffinity(recipe.nutritionLabels || [], profile.diet)

  return (
    signed(cuisineRaw, profile.max.cuisine) +
    signed(mealRaw, profile.max.meal) +
    signed(dietRaw, profile.max.diet)
  )
}

// Community-quality term, normalized to 0..1: half from the average star rating,
// half from save popularity relative to the catalog-wide max (passed by the
// caller). Used only as a tie-breaker between recipes that are already on-taste.
function qualityScore(recipe, numTimesSavedMax = 0) {
  const rateValue = recipe.rating?.rateValue || 0
  const savePop = numTimesSavedMax > 0 ? (recipe.numTimesSaved || 0) / numTimesSavedMax : 0
  return 0.5 * (rateValue / 5) + 0.5 * savePop
}

// Blended score used to RANK on-taste candidates: taste plus a small additive
// quality nudge, so a well-loved recipe edges out an obscure one of equal taste
// match without overriding the personalization. Note this is intentionally NOT
// the inclusion gate — a recipe with zero taste but good quality has a positive
// blended score yet must not appear (selectForYou filters on tasteScore).
//
// numTimesSavedMax is the catalog-wide max (passed by the caller) so the quality
// term is normalized rather than unbounded.
function scoreRecipe(recipe, profile, numTimesSavedMax = 0) {
  return tasteScore(recipe, profile) + QUALITY_WEIGHT * qualityScore(recipe, numTimesSavedMax)
}

// Fisher-Yates shuffle with an injectable RNG (so tests are deterministic).
function shuffle(arr, rng = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Rank candidates, enforce per-cuisine diversity, then shuffle the top tier for
// "fresh each visit" variety. Returns up to `limit` recipes.
//
// - candidates: visible recipes already excluding seen/own (caller's job)
// - profile: from buildTasteProfile
// - limit: row size (default 8)
// - rng: injectable for tests
function selectForYou(candidates, profile, { limit = 8, numTimesSavedMax = 0, rng = Math.random } = {}) {
  const scored = candidates
    .map((recipe) => ({
      recipe,
      taste: tasteScore(recipe, profile),
      score: scoreRecipe(recipe, profile, numTimesSavedMax),
    }))
    // Gate on TASTE, not the blended score — better an empty/short row than
    // padding it with irrelevant recipes. A popular recipe the user has no
    // affinity for has taste === 0 (blended score > 0 from the quality nudge),
    // and is dropped here so quality only ever ranks on-taste recipes.
    .filter((s) => s.taste > 0)
    .sort((a, b) => b.score - a.score)

  // Diversity cap: at most MAX_PER_CUISINE of any cuisine, walking best-first.
  const perCuisine = new Map()
  const diverse = []
  for (const s of scored) {
    const c = s.recipe.cuisine || ''
    const n = perCuisine.get(c) || 0
    if (n >= MAX_PER_CUISINE) continue
    perCuisine.set(c, n + 1)
    diverse.push(s)
  }

  // Freshness: keep a top tier of 2x the row size, shuffle, then slice. This
  // varies membership/order between visits while staying in the relevant set.
  const tier = diverse.slice(0, limit * 2)
  return shuffle(tier, rng)
    .slice(0, limit)
    .map((s) => s.recipe)
}

module.exports = {
  MIN_SIGNAL,
  WEIGHTS,
  MAX_PER_CUISINE,
  buildTasteProfile,
  interactionWeight,
  tasteScore,
  qualityScore,
  scoreRecipe,
  selectForYou,
  shuffle,
}
