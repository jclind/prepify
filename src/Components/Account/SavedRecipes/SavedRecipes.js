import React, { useState, useEffect } from 'react'
import { useRecipe } from '../../../context/RecipeContext'
import RecipeThumbnail from '../../RecipeThumbnail/RecipeThumbnail'
import Select from 'react-select'

import './SavedRecipes.scss'

const options = [
  // { value: 'popular', label: 'Popular' },
  // { value: 'new', label: 'Recipe Date: Newest' },
  // { value: 'old', label: 'Recipe Date: Oldest' },
  // { value: 'shortest', label: 'Time: Shortest' },
  // { value: 'longest', label: 'Time: Longest' },
  { value: 'newAdd', label: 'Save Time: Recent' },
  { value: 'oldAdd', label: 'Save Time: Oldest' },
]
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    background: '#eeeeee',
    minHeight: '40px',
    height: '40px',
    boxShadow: state.isFocused ? null : null,
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: 'hsl(0, 0%, 0%)',
    fontWeight: '500',
    paddingBottom: '3px',
  }),

  valueContainer: (provided, state) => ({
    ...provided,
    height: '40px',
    padding: '0 6px',
  }),

  input: (provided, state) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: state => ({
    display: 'none',
  }),
  indicatorsContainer: (provided, state) => ({
    ...provided,
    height: '40px',
  }),
}

const SavedRecipes = () => {
  const [recipes, setRecipes] = useState([])
  const [recipesPage, setRecipesPage] = useState(0)
  const { getSavedRecipes } = useRecipe()
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectOption, setSelectOption] = useState(options[0])
  const [selectValue, setSelectValue] = useState(options[0].value)

  const handleGetSavedRecipes = (recipesPage, selectValue) => {
    setLoading(true)
    if (recipesPage >= 0 && selectValue) {
      getSavedRecipes(recipesPage, 5, selectValue)
        .then(res => {
          const updatedArr =
            recipesPage === 0
              ? [...res.data.recipes]
              : [...recipes, ...res.data.recipes]
          setRecipes([...updatedArr])

          if (Number(res.data.totalCount) > updatedArr.length) {
            setIsMoreRecipes(true)
          } else {
            setIsMoreRecipes(false)
          }

          setRecipesPage(recipesPage + 1)
          setLoading(false)
        })
        .catch(err => {
          console.log(err)
        })
    }
  }

  useEffect(() => {
    handleGetSavedRecipes(recipesPage, selectValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = e => {
    setSelectOption(e)
    setSelectValue(e.value)
    setRecipesPage(0)
    handleGetSavedRecipes(0, e.value)
  }
  const handleLoadMoreRecipes = () => {
    handleGetSavedRecipes(recipesPage, selectValue)
  }

  return (
    <div className='saved-recipes'>
      <div className='saved-recipes-filters'>
        <Select
          options={options}
          styles={customStyles}
          isSearchable={false}
          isClearable={false}
          className='select'
          onChange={handleSelectChange}
          value={selectOption}
        />
      </div>
      {loading ? (
        <div className='thumbnails-container'>
          <RecipeThumbnail loading={true} />
          <RecipeThumbnail loading={true} />
          <RecipeThumbnail loading={true} />
        </div>
      ) : recipes.length > 0 ? (
        <div className='thumbnails-container'>
          {recipes.map(recipe => {
            return <RecipeThumbnail key={recipe._id} recipe={recipe} />
          })}
          {isMoreRecipes && recipes.length > 0 ? (
            <button
              className='load-more-recipes-btn btn'
              onClick={handleLoadMoreRecipes}
            >
              Load More Recipes
            </button>
          ) : null}
        </div>
      ) : (
        <div className='no-recipes-saved'>
          <div className='header'>No Recipes Saved</div>
          <div className='text'>
            Your personally saved recipes will show up here.
          </div>
        </div>
      )}
    </div>
  )
}

export default SavedRecipes
