import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
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
          <AiOutlineClockCircle /> {recipe.totalTime}m
          {' · '}
          <AiOutlineStar /> {ratingLabel(recipe.rating)}
          {recipe.servingPrice != null && <> {' · '} {fmtPrice(recipe.servingPrice)}</>}
        </span>
      </div>
    </Link>
  </li>
)

const SkeletonRow: FC = () => (
  <li className='skeleton-row'>
    <Skeleton baseColor={skeletonColor} width={56} height={56} borderRadius={10} />
    <div className='info'>
      <Skeleton baseColor={skeletonColor} height={14} width='90%' />
      <Skeleton baseColor={skeletonColor} height={11} width='60%' />
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

  return (
    <div className='home-meal-cols'>
      {columns.map(({ meal, picks, isLoading, isError }) => (
        <div className='home-meal-col' key={meal}>
          <div className='meal-col-head'>
            <h3>{meal}</h3>
            <Link to='/recipes' className='meal-see-all'>See all</Link>
          </div>
          <ul>
            {isLoading ? (
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
