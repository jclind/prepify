import React, { FC } from 'react'
import './TrendingRecipes.scss'
import { useQuery } from '@tanstack/react-query'

import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'

const TrendingRecipes: FC = () => {
  const { data, isLoading } = useQuery<RecipeType[]>({
    queryKey: ['trending-recipes'],
    queryFn: () => RecipeAPI.getTrendingRecipes(4),
  })

  const recipes = data ?? []

  return (
    <div className='trending-recipes'>
      <h2 className='title'>Trending</h2>
      <div className={`recipes ${isLoading ? 'loading' : ''}`}>
        {recipes.length > 0 ? (
          recipes.map(recipe => {
            return <RecipeThumbnail key={recipe._id} recipe={recipe} />
          })
        ) : (
          <>
            <RecipeThumbnail recipe={null} loading={true} />
            <RecipeThumbnail recipe={null} loading={true} />
            <RecipeThumbnail recipe={null} loading={true} />
            <RecipeThumbnail recipe={null} loading={true} />
          </>
        )}
      </div>
    </div>
  )
}

export default TrendingRecipes
