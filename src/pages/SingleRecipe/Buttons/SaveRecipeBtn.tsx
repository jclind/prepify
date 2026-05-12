import React, { FC, useState } from 'react'
import {
  BsBookmark,
  BsFillBookmarkFill,
  BsFillBookmarkCheckFill,
} from 'react-icons/bs'

import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type SaveRecipeBtnProps = { recipeId: string }

const SaveRecipeBtn: FC<SaveRecipeBtnProps> = ({ recipeId }) => {
  const [isHovered, setIsHovered] = useState(false)

  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['savedRecipe', uid, recipeId],
    queryFn: () => RecipeAPI.getSavedRecipe(uid!, recipeId),
    enabled: !!uid,
  })

  const isSaved = data != null ? data.length > 0 : false

  const handleToggleSaveRecipe = (recipeId: string) => {
    if (uid) {
      if (isSaved) {
        RecipeAPI.unsaveRecipe(uid, recipeId).then(() =>
          queryClient.setQueryData(['savedRecipe', uid, recipeId], [])
        )
      } else {
        RecipeAPI.saveRecipe(uid, recipeId).then(() =>
          queryClient.setQueryData(['savedRecipe', uid, recipeId], [recipeId])
        )
      }
    } else {
      toast('Please login to save recipes.', { duration: 10000 })
    }
  }

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
