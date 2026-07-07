import { BookOpenIcon, ChevronDownIcon } from 'src/Components/icons'
import React, { FC } from 'react'

import './UserRecipes.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { usePaginatedLoadMore } from 'src/pages/Account/usePaginatedLoadMore'
import UserRecipeThumbnail from './UserRecipeThumbnail'

// Default order: newest first. (The sort control was removed for now; the query
// keeps this fixed order.)
const SORT = 'new'

const UserRecipes: FC = () => {
  // `showGrid` (the hook's showList) stays true across the one-frame gap where
  // the query has settled but the accumulator hasn't populated yet, so the
  // "no recipes" empty state can't flash before a genuine zero result.
  const {
    items: recipes,
    isLoading,
    showSkeleton,
    isMore,
    showList: showGrid,
    loadMore,
  } = usePaginatedLoadMore<RecipeType>({
    queryKey: page => ['created-recipes', SORT, page],
    queryFn: page =>
      RecipeAPI.getCreatedRecipes(page, 6, SORT).then(
        d => d && { items: d.recipes, totalCount: d.totalCount }
      ),
  })

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
          {isMore && recipes.length > 0 ? (
            <button className='load-more-btn' onClick={loadMore}>
              Load more recipes <ChevronDownIcon />
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
