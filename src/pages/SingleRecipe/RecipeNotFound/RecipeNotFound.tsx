import { ChefHatIcon, SearchIcon } from 'src/Components/icons'
import React from 'react'
import { Link } from 'react-router-dom'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import './RecipeNotFound.scss'

const RecipeNotFound = () => {
  return (
    <div className='recipe-not-found'>
      <div className='rnf-card'>
        <span className='rnf-icon' aria-hidden='true'>
          <ChefHatIcon />
        </span>
        <h1>Recipe not found</h1>
        <p className='text'>
          We couldn't find the recipe you're looking for — it may have been
          removed, or the link might be incorrect.
        </p>

        <div className='rnf-search'>
          <div className='rnf-search-label'>
            <SearchIcon aria-hidden='true' />
            <span>Search for something else</span>
          </div>
          <SearchRecipesInput autoComplete={true} />
        </div>

        <div className='rnf-actions'>
          <Link to='/recipes' className='rnf-browse'>
            Browse all recipes
          </Link>
        </div>

        <p className='rnf-help'>
          Think this is a mistake?{' '}
          <Link to='/help' className='contact-link'>
            Contact our help team
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default RecipeNotFound
