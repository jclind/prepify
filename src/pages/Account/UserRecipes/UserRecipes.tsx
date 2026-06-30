import { BookOpenIcon } from 'src/Components/icons'
import React, { FC, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import './UserRecipes.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import UserRecipeThumbnail from './UserRecipeThumbnail'

// Default order: newest first. (The sort control was removed for now; the query
// keeps this fixed order.)
const SORT = 'new'

const UserRecipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['created-recipes', SORT, currPage],
    queryFn: () => RecipeAPI.getCreatedRecipes(currPage, 6, SORT),
  })

  useEffect(() => {
    if (data) {
      if (currPage === 0) {
        setRecipes([...data.recipes])
        setIsMoreRecipes(Number(data.totalCount) > data.recipes.length)
      } else {
        const updated = [...recipes, ...data.recipes]
        setRecipes(updated)
        setIsMoreRecipes(Number(data.totalCount) > updated.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleLoadMoreRecipes = () => {
    setCurrPage(prev => prev + 1)
  }

  const showSkeleton = useDelayedLoading(isLoading)
  // `recipes` is populated by the effect above one render AFTER react-query
  // flips `isLoading` to false, so on a fast load there's a frame where the
  // query has settled but `recipes` is still []. Gate the grid on the resolved
  // payload too (`data.recipes`) so that frame shows the grid, not a flash of
  // the "no recipes" empty state. The empty state then appears only once the
  // query has genuinely returned zero recipes.
  const dataHasRecipes = !!data && data.recipes.length > 0
  const showGrid = recipes.length > 0 || isLoading || dataHasRecipes

  return (
    <div className='user-recipes'>
      {showGrid ? (
        <>
          {/* Render the skeleton thumbnails whenever loading so the grid reserves
              its height from frame 1; the flash-guard delay only hides them
              (sk-hold) until it's worth drawing — no blank-then-grow jump. */}
          <div
            className={`thumbnails-container ${
              isLoading && !showSkeleton ? 'sk-hold' : ''
            }`}
          >
            {!isLoading ? (
              recipes.map(recipe => (
                <UserRecipeThumbnail key={recipe._id} recipe={recipe} />
              ))
            ) : (
              <>
                <UserRecipeThumbnail recipe={null} loading={true} />
                <UserRecipeThumbnail recipe={null} loading={true} />
                <UserRecipeThumbnail recipe={null} loading={true} />
              </>
            )}
          </div>
          {isMoreRecipes && recipes.length > 0 ? (
            <button
              className='load-more-btn'
              onClick={handleLoadMoreRecipes}
            >
              Load More Recipes
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<BookOpenIcon />}
          title='No Recipes Created Yet'
          description='Share your first recipe with the Prepify community!'
          action={{ label: 'Add a Recipe', to: '/add-recipe' }}
        />
      )}
    </div>
  )
}

export default UserRecipes
