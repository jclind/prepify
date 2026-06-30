import { ClockIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import { skeletonColor, fmtPrice, ratingLabel } from './homeFormat'

const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const
const PER_COL = 4

const MealRow: FC<{ recipe: RecipeType }> = ({ recipe }) => (
  <li>
    <Link to={`/recipes/${recipe._id}`}>
      <img
        src={recipe.recipeImage}
        alt=''
        loading='lazy'
        decoding='async'
      />
      <div className='info'>
        <span className='title'>{recipe.title}</span>
        <span className='sub'>
          <ClockIcon /> {recipe.totalTime}m
          {' · '}
          <StarOutlineIcon /> {ratingLabel(recipe.rating)}
          {recipe.servingPrice != null && <> {' · '} {fmtPrice(recipe.servingPrice)}</>}
        </span>
      </div>
    </Link>
  </li>
)

// Mirror the real MealRow: the thumb is sized by CSS (so it tracks the
// responsive 56→44px image) and the text block reserves two title lines + the
// sub line, so a column of skeletons is the same height as a column of loaded
// rows (whose titles clamp to two lines) — no jump on swap.
const SkeletonRow: FC = () => (
  <li className='skeleton-row' aria-hidden='true'>
    <span className='sk-thumb'>
      <Skeleton baseColor={skeletonColor} height='100%' />
    </span>
    <div className='info'>
      <Skeleton inline baseColor={skeletonColor} height={12} width='95%' />
      <Skeleton inline baseColor={skeletonColor} height={12} width='65%' />
      <Skeleton inline baseColor={skeletonColor} height={9} width='45%' />
    </div>
  </li>
)

const HomeBrowseByMeal: FC = () => {
  // Fetch extra per meal so we can drop cross-column duplicates and still fill each column.
  const results = useQueries({
    queries: MEALS.map(meal => ({
      queryKey: ['recipes-by-meal', meal],
      queryFn: () =>
        RecipeAPI.getAllRecipes({
          order: 'trending',
          tags: [meal],
          recipesPerPage: PER_COL * 3,
        }),
      staleTime: 5 * 60 * 1000,
    })),
  })

  // Many recipes are tagged for multiple meals (e.g. Lunch + Dinner). Walk the
  // columns in order and let the first meal claim a recipe, so each column shows
  // a distinct set rather than repeating the same trending recipes.
  const claimed = new Set<string>()
  const columns = MEALS.map((meal, i) => {
    const picks: RecipeType[] = []
    for (const r of results[i].data?.recipeList ?? []) {
      if (picks.length >= PER_COL) break
      if (claimed.has(r._id)) continue
      claimed.add(r._id)
      picks.push(r)
    }
    return { meal, picks, isLoading: results[i].isLoading, isError: results[i].isError }
  })

  // Per docs/design/loading-states.md: one shared delay gate for the column
  // skeletons so a cache hit fills the rows without a flash. `isLoading` still
  // gates each column (so the "no recipes" row can't flash), the delay only
  // decides skeleton-vs-blank within a still-loading column.
  const showSkeleton = useDelayedLoading(results.some(r => r.isLoading))

  return (
    <div className='home-meal-cols'>
      {columns.map(({ meal, picks, isLoading, isError }) => (
        <div className='home-meal-col' key={meal}>
          <div className='meal-col-head'>
            <h3>{meal}</h3>
            <Link to='/recipes' className='meal-see-all'>See all</Link>
          </div>
          <ul className={(isLoading) && !showSkeleton ? 'sk-hold' : ''}>
            {isLoading ? (
              // Always render the skeleton rows while loading so the column holds
              // its height from frame 1; the flash-guard delay only hides them
              // (visibility) until it's worth drawing — no grow-on-appear jump.
              Array.from({ length: PER_COL }).map((_, k) => <SkeletonRow key={k} />)
            ) : isError ? (
              <li className='empty-row'>Couldn’t load recipes.</li>
            ) : picks.length > 0 ? (
              picks.map(r => <MealRow recipe={r} key={r._id} />)
            ) : (
              <li className='empty-row'>No {meal.toLowerCase()} recipes yet.</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default HomeBrowseByMeal
