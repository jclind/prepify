import { formatRating } from 'src/util/formatRating'
import { RecipeType } from 'types'

// Re-exported so the home skeleton components share the one app-wide skeleton grey.
export { skeletonBase as skeletonColor } from 'src/util/loadingStyles'

// Shared formatting helpers for the home page sections (Trending + Browse by meal).
export const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

/** "New" when a recipe has no ratings yet, otherwise the formatted average. */
export const ratingLabel = (rating: RecipeType['rating']) => {
  const count = Number(rating?.rateCount) || 0
  return count === 0 ? 'New' : formatRating(rating.rateValue, count)
}
