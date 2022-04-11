import React, { useState, useEffect } from 'react'
import {
  BsBookmark,
  BsFillBookmarkFill,
  BsFillBookmarkCheckFill,
} from 'react-icons/bs'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { useRecipe } from '../../context/RecipeContext'
import { useAlert } from 'react-alert'

const SaveRecipeBtn = ({ recipeId }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const { user } = useAuth()
  const { saveRecipe, getSavedRecipe, unsaveRecipe } = useRecipe()

  const alert = useAlert()

  const handleToggleSaveRecipe = recipeId => {
    if (user) {
      if (isSaved) {
        unsaveRecipe(user.uid, recipeId).then(() => setIsSaved(false))
      } else {
        saveRecipe(user.uid, recipeId).then(res => {
          setIsSaved(true)
        })
      }
    } else {
      alert.show(
        <div>
          Please <Link to='/login'>login</Link> to save recipes.
        </div>,
        {
          timeout: 10000,
          type: 'info',
        }
      )
    }
  }

  useEffect(() => {
    if (user) {
      const getIsRecipeSaved = async recipeId => {
        return await getSavedRecipe(user.uid, recipeId)
      }
      getIsRecipeSaved(recipeId).then(res => {
        const currIsSaved = res.data.length > 0
        setIsSaved(currIsSaved)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className='save-recipe'>
      <button
        className='save-recipe-btn btn'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => handleToggleSaveRecipe(recipeId)}
      >
        {!isSaved ? (
          <>
            {isHovered ? (
              <BsFillBookmarkFill className='icon' />
            ) : (
              <BsBookmark className='icon' />
            )}
            Save
          </>
        ) : (
          <>
            <BsFillBookmarkCheckFill className='icon' />
            Saved
          </>
        )}
      </button>
    </div>
  )
}

export default SaveRecipeBtn
