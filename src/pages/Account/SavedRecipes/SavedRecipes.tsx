import React, { FC, useState, useEffect } from 'react'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import Select, { MultiValue, SingleValue } from 'react-select'

import './SavedRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'

const options = [
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
  const [recipesPage, setRecipesPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  const [selectOption, setSelectOption] = useState(options[0])

  const [loading, setLoading] = useState(true)

  const handleGetSavedRecipes = (recipesPage: number, selectValue: string) => {
    if (recipesPage >= 0 && selectValue) {
      setLoading(true)
      RecipeAPI.getSavedRecipes(recipesPage, 6, selectValue).then(res => {
        if (res) {
          const updatedArr =
            recipesPage === 0 ? [...res.recipes] : [...recipes, ...res.recipes]
          setRecipes([...updatedArr])

          if (Number(res.totalCount) > updatedArr.length) {
            setIsMoreRecipes(true)
          } else {
            setIsMoreRecipes(false)
          }

          setRecipesPage(recipesPage + 1)
        }
        setLoading(false)
      })
    }
  }

  useEffect(() => {
    handleGetSavedRecipes(recipesPage, selectOption.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = (
    e: MultiValue<{ value: string; label: string }> | SingleValue<{ value: string; label: string }>
  ) => {
    const option = e as SingleValue<{ value: string; label: string }>
    if (!option) return
    setSelectOption(option)
    setRecipesPage(0)
    handleGetSavedRecipes(0, option.value)
  }
  const handleLoadMoreRecipes = () => {
    handleGetSavedRecipes(recipesPage, selectOption.value)
  }

  return (
    <div className='saved-recipes'>
      {recipes.length > 0 || loading ? (
        <>
          <div className='saved-recipes-filters'>
            <Select
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
            {!loading ? (
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
