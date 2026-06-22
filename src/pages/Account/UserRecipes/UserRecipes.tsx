import React, { FC, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiBookOpen } from 'react-icons/fi'

import './UserRecipes.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'
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

  // On the first load, hold an empty frame while a fast query settles, so the
  // skeleton only shows for genuinely slow loads — and the empty state never
  // flashes before data. Scoped to the initial load so paging never blanks the
  // already-rendered grid.
  if (isLoading && !showSkeleton && recipes.length === 0) {
    return <div className='user-recipes' />
  }

  return (
    <div className='user-recipes'>
      {showGrid ? (
        <>
          <div className='thumbnails-container'>
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
              className='load-more-btn btn'
              onClick={handleLoadMoreRecipes}
            >
              Load More Recipes
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<FiBookOpen />}
          title='No Recipes Created Yet'
          description='Share your first recipe with the Prepify community!'
          action={{ label: 'Add a Recipe', to: '/add-recipe' }}
        />
      )}
    </div>
  )
}

export default UserRecipes
