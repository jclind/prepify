import React, { FC, useMemo, useState } from 'react'
import { BiBookmark, BiSolidBookmark } from 'react-icons/bi'
import { AiFillStar } from 'react-icons/ai'
import { RecipeType } from 'types'
import { MOCK_RECIPES } from './mockRecipes'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'

/**
 * Shared primitives + a client-side filter/sort hook for the redesign takes.
 * The takes are presentation-only; this module gives them interactivity over
 * the bundled mock feed so chips, sorts, and search feel real in the preview.
 */

export type SortId =
  | 'popular'
  | 'new'
  | 'old'
  | 'cheapest'
  | 'expensive'
  | 'shortest'
  | 'longest'

export const SORT_OPTIONS: { value: SortId; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'Newest' },
  { value: 'old', label: 'Oldest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'expensive', label: 'Priciest' },
  { value: 'shortest', label: 'Quickest' },
  { value: 'longest', label: 'Longest' },
]

const dietLabelMap: Record<string, string> = dietLabelsOptions.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {}
)

/** "VEGAN" -> "Vegan", "High-Protein" -> "High Protein" */
export const prettyDiet = (value: string): string =>
  dietLabelMap[value] ?? value.replace(/[-_]/g, ' ')

export const servingPrice = (r: RecipeType): string =>
  r.servingPrice != null ? `$${(r.servingPrice / 100).toFixed(2)}` : '—'

export const recipePrice = (r: RecipeType): string =>
  r.servingPrice != null
    ? `$${((r.servingPrice / 100) * r.servings).toFixed(2)}`
    : '—'

export const formatTime = (mins: number): string =>
  mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim()
    : `${mins} min`

export type Filters = {
  query: string
  sort: SortId
  diets: string[]
  cuisine: string
  meal: string
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  sort: 'popular',
  diets: [],
  cuisine: '',
  meal: '',
}

/** Client-side filter + sort over the mock feed, mirroring server semantics. */
export const useRecipeFilters = (initial?: Partial<Filters>) => {
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    ...initial,
  })

  const update = (patch: Partial<Filters>) =>
    setFilters(f => ({ ...f, ...patch }))

  const reset = () => setFilters(EMPTY_FILTERS)

  const toggleDiet = (value: string) =>
    setFilters(f => ({
      ...f,
      diets: f.diets.includes(value)
        ? f.diets.filter(d => d !== value)
        : [...f.diets, value],
    }))

  const results = useMemo(() => {
    let list = MOCK_RECIPES.slice()
    const q = filters.query.trim().toLowerCase()
    if (q) list = list.filter(r => r.title.toLowerCase().includes(q))
    if (filters.cuisine)
      list = list.filter(r => r.cuisine === filters.cuisine)
    if (filters.meal)
      list = list.filter(r => r.mealTypes.includes(filters.meal))
    if (filters.diets.length)
      list = list.filter(r =>
        filters.diets.every(d => (r.nutritionLabels ?? []).includes(d))
      )

    const byPrice = (r: RecipeType) => r.servingPrice ?? Infinity
    switch (filters.sort) {
      case 'new':
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        break
      case 'old':
        list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        break
      case 'cheapest':
        list.sort((a, b) => byPrice(a) - byPrice(b))
        break
      case 'expensive':
        list.sort((a, b) => byPrice(b) - byPrice(a))
        break
      case 'shortest':
        list.sort((a, b) => a.totalTime - b.totalTime)
        break
      case 'longest':
        list.sort((a, b) => b.totalTime - a.totalTime)
        break
      default:
        list.sort((a, b) => b.numTimesSaved - a.numTimesSaved)
    }
    return list
  }, [filters])

  const activeCount =
    filters.diets.length +
    (filters.cuisine ? 1 : 0) +
    (filters.meal ? 1 : 0) +
    (filters.sort !== 'popular' ? 1 : 0)

  return { filters, update, reset, toggleDiet, results, activeCount }
}

/**
 * Compact star rating with fractional fill + numeric value. Uses SVG star
 * icons (centered in their box) overlaid via a width-clipped fill layer, so the
 * partial star is accurate and the number lines up with the stars' true middle.
 */
const STAR_KEYS = [0, 1, 2, 3, 4]
export const Stars: FC<{ value: number; count?: number; size?: number }> = ({
  value,
  count,
  size = 14,
}) => {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span
      className='rp-stars'
      style={{ fontSize: size }}
      aria-label={`${value} out of 5`}
    >
      <span className='rp-stars__icons'>
        <span className='rp-stars__track'>
          {STAR_KEYS.map(i => (
            <AiFillStar key={i} />
          ))}
        </span>
        <span className='rp-stars__fill' style={{ width: `${pct}%` }}>
          {STAR_KEYS.map(i => (
            <AiFillStar key={i} />
          ))}
        </span>
      </span>
      <span className='rp-stars__num'>
        {value.toFixed(1)}
        {count != null ? ` (${count})` : ''}
      </span>
    </span>
  )
}

/**
 * Single-star rating (icon + value + count), mirroring the current production
 * RecipeThumbnail. Lighter than the full 5-star display.
 */
export const RatingCompact: FC<{ value: number; count?: number }> = ({
  value,
  count,
}) => (
  <span className='rp-rating-compact'>
    <AiFillStar className='rp-rating-compact__star' />
    <span className='rp-rating-compact__val'>{value.toFixed(1)}</span>
    {count != null && (
      <span className='rp-rating-compact__count'>({count})</span>
    )}
  </span>
)

/** Small save / bookmark toggle used by several takes. */
export const SaveButton: FC<{ className?: string }> = ({ className }) => {
  const [saved, setSaved] = useState(false)
  return (
    <button
      type='button'
      className={`rp-save ${saved ? 'is-saved' : ''} ${className ?? ''}`}
      aria-pressed={saved}
      aria-label={saved ? 'Saved' : 'Save recipe'}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        setSaved(s => !s)
      }}
    >
      {saved ? <BiSolidBookmark /> : <BiBookmark />}
    </button>
  )
}

export const CUISINES = [
  'Italian',
  'American',
  'Mexican',
  'Thai',
  'Korean',
  'Mediterranean',
]

export const MEALS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Salad',
  'Soup or Stew',
  'Side Dish',
]
