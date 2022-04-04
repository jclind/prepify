import React from 'react'
import { Link } from 'react-router-dom'
import SearchRecipesInput from '../../SearchRecipesInput/SearchRecipesInput'
import './RecipeNotFound.scss'

const RecipeNotFound = () => {
  return (
    <div className='recipe-not-found'>
      <h1>Recipe not found!</h1>
      <p className='text'>
        It doesn't look like the recipe you are looking for exists. If you think
        this is an error, please{' '}
        <Link to='/help' className='contact-link'>
          contact our help team
        </Link>
        .
      </p>
      <SearchRecipesInput autoComplete={true} />
    </div>
  )
}

export default RecipeNotFound
