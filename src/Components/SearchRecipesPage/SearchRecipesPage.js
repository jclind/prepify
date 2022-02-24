import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRecipe } from '../../context/RecipeContext'
import RecipeThumbnail from '../RecipeThumbnail/RecipeThumbnail'
import './SearchRecipesPage.scss'

// ! IDEA FOR SEARCH OPTIMIZATION
// Add array with each word of title so that you can use array in with firestore query

const SearchRecipesPage = () => {
  const [recipeResults, setReicipeResults] = useState([])
  const params = useParams()
  const queryString = params.searchQuery.split('+').join(' ').toLowerCase()

  const { searchRecipes } = useRecipe()

  useEffect(() => {
    searchRecipes(queryString).then(arr => {
      setReicipeResults(arr)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='search-recipes-page page'>
      Search Recipes Page: {queryString}
      <div className='results-list'>
        {recipeResults.length > 0 &&
          recipeResults.map(result => {
            return <RecipeThumbnail key={result.recipeId} recipe={result} />
          })}
      </div>
    </div>
  )
}

export default SearchRecipesPage
