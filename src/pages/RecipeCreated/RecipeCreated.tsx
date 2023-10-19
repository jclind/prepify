import React from 'react'
import './RecipeCreated.scss'
import { Link, useParams } from 'react-router-dom'
import { BsFillCheckCircleFill, BsCircleFill } from 'react-icons/bs'
import { PiStarFourFill } from 'react-icons/pi'

const RecipeCreated = () => {
  const { recipeId } = useParams<{ recipeId: string }>()

  return (
    <div className='recipe-created-page'>
      <div className='created-card'>
        <div className='celebration-icons'>
          <BsCircleFill className='icon icon-1' />
          <PiStarFourFill className='icon icon-2' />
          <PiStarFourFill className='icon icon-3' />

          <PiStarFourFill className='icon icon-4' />
          <BsCircleFill className='icon icon-5' />
          <BsCircleFill className='icon icon-6' />
        </div>
        <div className='icon-container'>
          {/* <div className='inner-circle'> */}
          <BsFillCheckCircleFill className='icon' />
          {/* </div> */}
        </div>
        <div className='title'>Recipe Created!</div>
        <div className='text'>
          Your recipe was successfully created and is visible on the site. Click
          below to view:
        </div>
        <div className='links'>
          <Link to={'/'} className='return-home-btn btn-no-styles link'>
            Home
          </Link>
          <Link
            to={`/recipes/${recipeId}`}
            className='view-recipe-btn btn-no-styles link'
          >
            View Recipe
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RecipeCreated
