import { formatRating } from 'src/util/formatRating'
import { RecipeType } from 'types'

// Shared formatting helpers for the home page sections (Trending + Browse by meal).
export const skeletonColor = '#e6e6e6'

export const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

/** "New" when a recipe has no ratings yet, otherwise the formatted average. */
export const ratingLabel = (rating: RecipeType['rating']) => {
  const count = Number(rating?.rateCount) || 0
  return count === 0 ? 'New' : formatRating(rating.rateValue, count)
}
