import React, { FC, useState } from 'react'
import {
  BsBookmark,
  BsFillBookmarkFill,
  BsFillBookmarkCheckFill,
} from 'react-icons/bs'

import { useSaveRecipe } from 'src/hooks/useSaveRecipe'

type SaveRecipeBtnProps = { recipeId: string }

const SaveRecipeBtn: FC<SaveRecipeBtnProps> = ({ recipeId }) => {
  const [isHovered, setIsHovered] = useState(false)
  const { isSaved, toggle } = useSaveRecipe(recipeId)

  return (
    <div className='save-recipe'>
      <button
        className={`save-recipe-btn btn ${isSaved ? 'saved' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => toggle()}
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
