import React, { useState, useEffect } from 'react'
import {
  BsBookmark,
  BsFillBookmarkFill,
  BsFillBookmarkCheckFill,
} from 'react-icons/bs'
import { Link } from 'react-router-dom'

import { useAlert } from 'react-alert'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

type SaveRecipeBtnProps = { recipeId: string }

const SaveRecipeBtn = ({ recipeId }: SaveRecipeBtnProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const uid = AuthAPI.getUID()

  const alert = useAlert()

  const handleToggleSaveRecipe = (recipeId: string) => {
    if (uid) {
      if (isSaved) {
        RecipeAPI.unsaveRecipe(uid, recipeId).then(() => setIsSaved(false))
      } else {
        RecipeAPI.saveRecipe(uid, recipeId).then(() => setIsSaved(true))
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
    if (uid) {
      const getIsRecipeSaved = async (recipeId: string) => {
        return await RecipeAPI.getSavedRecipe(uid, recipeId)
      }
      getIsRecipeSaved(recipeId).then(res => {
        const currIsSaved = res.length > 0
        setIsSaved(currIsSaved)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  return (
    <div className='save-recipe'>
      <button
        className={`save-recipe-btn btn ${isSaved ? 'saved' : ''}`}
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
