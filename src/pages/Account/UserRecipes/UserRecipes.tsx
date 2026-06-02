import React, { FC, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Select, { SingleValue } from 'react-select'

import './UserRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'
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

  const showGrid = recipes.length > 0 || isLoading

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
        <div className='no-data-saved'>
          <h2>No Recipes Created Yet</h2>
          <p>Share your first recipe with the Prepify community!</p>
          <Link to='/add-recipe' className='btn add-recipe-btn'>
            Add a Recipe
          </Link>
        </div>
      )}
    </div>
  )
}

export default UserRecipes
