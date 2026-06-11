import React, { FC, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import Select, { SingleValue } from 'react-select'

import './SavedRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'

type OptionType = { value: string; label: string }

const options: OptionType[] = [
  // { value: 'popular', label: 'Popular' },
  // { value: 'new', label: 'Recipe Date: Newest' },
  // { value: 'old', label: 'Recipe Date: Oldest' },
  // { value: 'shortest', label: 'Time: Shortest' },
  // { value: 'longest', label: 'Time: Longest' },
  { value: 'newAdd', label: 'Save Time: Recent' },
  { value: 'oldAdd', label: 'Save Time: Oldest' },
]

const SavedRecipes: FC = () => {
  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  const [selectOption, setSelectOption] = useState(options[0])

  const { data, isLoading } = useQuery({
    queryKey: ['saved-recipes', selectOption.value, currPage],
    queryFn: () => RecipeAPI.getSavedRecipes(currPage, 6, selectOption.value),
  })
  const showSkeleton = useDelayedLoading(isLoading)

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

  // On the first load, hold an empty frame while a fast query settles, so the
  // skeleton only shows for genuinely slow loads — and the empty state never
  // flashes before data. Scoped to the initial load so paging never blanks the
  // already-rendered list.
  if (isLoading && !showSkeleton && recipes.length === 0) {
    return <div className='saved-recipes' />
  }

  return (
    <div className='saved-recipes'>
      {recipes.length > 0 || isLoading ? (
        <>
          <div className='saved-recipes-filters'>
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
              recipes.map(recipe => {
                return <RecipeThumbnail key={recipe._id} recipe={recipe} />
              })
            ) : (
              <>
                <RecipeThumbnail recipe={null} loading={true} />
                <RecipeThumbnail recipe={null} loading={true} />
                <RecipeThumbnail recipe={null} loading={true} />
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
        <div className='no-data-saved'>
          <h2>No Recipes Saved Yet</h2>
          <p>Start saving your favorite recipes today!</p>
        </div>
      )}
    </div>
  )
}

export default SavedRecipes
