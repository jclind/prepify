import React, { FC, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Select, { SingleValue } from 'react-select'
import { FiBookOpen } from 'react-icons/fi'

import './UserRecipes.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'
import UserRecipeThumbnail from './UserRecipeThumbnail'

type OptionType = { value: string; label: string }

const options: OptionType[] = [
  { value: 'new', label: 'Date Created: Newest' },
  { value: 'old', label: 'Date Created: Oldest' },
]

const UserRecipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  const [selectOption, setSelectOption] = useState(options[0])

  const { data, isLoading } = useQuery({
    queryKey: ['created-recipes', selectOption.value, currPage],
    queryFn: () => RecipeAPI.getCreatedRecipes(currPage, 6, selectOption.value),
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

  const handleSelectChange = (e: SingleValue<OptionType>) => {
    if (!e) return
    setSelectOption(e)
    setCurrPage(0)
  }

  const handleLoadMoreRecipes = () => {
    setCurrPage(prev => prev + 1)
  }

  const showSkeleton = useDelayedLoading(isLoading)
  const showGrid = recipes.length > 0 || isLoading

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
          <div className='user-recipes-filters'>
            <Select<OptionType, false>
              options={options}
              styles={selectCustomStyles}
              isSearchable={false}
              isClearable={false}
              className='select'
              onChange={handleSelectChange}
              value={selectOption}
            />
          </div>
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
