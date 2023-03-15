import React, { useState, useEffect } from 'react'
import './TrendingRecipes.scss'

import RecipeThumbnail from '../RecipeThumbnail/RecipeThumbnail'
import RecipeAPI from '../../api/recipes'
import { RecipeType } from 'types'

const TrendingRecipes = () => {
  const [recipes, setRecipes] = useState<RecipeType[]>([])

  useEffect(() => {
    RecipeAPI.getTrendingRecipes(4).then(res => {
      const resData: RecipeType[] = res
      setRecipes(resData)
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='trending-recipes'>
      <h2 className='title'>Trending</h2>
      <div className='recipes'>
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
