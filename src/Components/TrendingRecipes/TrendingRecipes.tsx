import React, { FC, useState, useEffect } from 'react'
import './TrendingRecipes.scss'

import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'

const TrendingRecipes: FC = () => {
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
      <div className={`recipes ${recipes.length < 0 ? '' : 'loading'}`}>
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
