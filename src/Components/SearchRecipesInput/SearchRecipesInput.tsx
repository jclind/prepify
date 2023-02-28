import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import './SearchRecipesInput.scss'
import { formatRating } from '../../util/formatRating'
import slugify from 'slugify'
import RecipeAPI from 'src/api/recipes'
import { RecipeSearchResponseType } from 'types'

function useOutsideAlerter(
  ref: React.RefObject<HTMLFormElement>,
  setVal: (val: boolean) => void
) {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setVal(true)
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}

type SearchRecipesInputProps = {
  defaultVal?: string
  autoComplete: boolean
}

const SearchRecipesInput = ({
  defaultVal,
  autoComplete,
}: SearchRecipesInputProps) => {
  const [searchRecipeVal, setSearchRecipeVal] = useState(defaultVal || '')

  const [autoCompleteResponse, setAutoCompleteResponse] = useState<
    RecipeSearchResponseType[]
  >([])

  const [isBlurred, setIsBlurred] = useState(true)

  const navigate = useNavigate()

  const wrapperRef = useRef<HTMLFormElement>(null)
  useOutsideAlerter(wrapperRef, setIsBlurred)

  const handleSubmit = (e: any) => {
    e.preventDefault()

    if (slugify(searchRecipeVal)) {
      navigate(`/recipes?q=${slugify(searchRecipeVal)}`)
    } else {
      navigate('/recipes')
    }
    setIsBlurred(true)
  }

  const getAutoCompleteResult = (title: string) => {
    if (title.length > 2) {
      RecipeAPI.searchAutoCompleteRecipes(title)
        .then(res => {
          setAutoCompleteResponse(res)
        })
        .catch(e => {
          console.log(e)
        })
    } else {
      setAutoCompleteResponse([])
    }
  }

  useEffect(() => {
    // If the autocomplete property passed through exists and is true, show auto complete results
    if (autoComplete) {
      getAutoCompleteResult(searchRecipeVal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRecipeVal])

  return (
    <form
      onSubmit={handleSubmit}
      className='search-recipes-form'
      ref={wrapperRef}
    >
      <label
        htmlFor='.search-recipes-input'
        className='search-recipes-input-label'
      >
        <AiOutlineSearch className='icon' />
        <input
          className='search-recipes-input'
          placeholder='Search All Recipes'
          onChange={e => setSearchRecipeVal(e.target.value)}
          value={searchRecipeVal}
          onFocus={() => setIsBlurred(false)}
        />
        {searchRecipeVal && (
          <div className='search-recipes-btn btn' onClick={handleSubmit}>
            Search
          </div>
        )}
      </label>
      {autoComplete && autoCompleteResponse.length > 0 && !isBlurred && (
        <div className='auto-complete-results'>
          <div className='recipes-container'>
            {autoCompleteResponse.map(recipe => {
              return (
                <div
                  className='recipe'
                  key={recipe._id}
                  onClick={() => navigate(`/recipes/${recipe._id}`)}
                >
                  <div className='image-container'>
                    <img src={recipe.recipeImage} alt='' className='img' />
                  </div>
                  <div className='info-content'>
                    <div className='title'>{recipe.title}</div>
                    <div className='data'>
                      <div className='time item'>
                        <CgTimer className='icon' /> {recipe.totalTime}
                      </div>
                      <div className='servings item'>
                        <AiOutlineUser className='icon' /> {recipe.servings}
                      </div>
                      <div className='rating item'>
                        <AiOutlineStar className='icon' />{' '}
                        {formatRating(
                          Number(recipe.rating.rateValue),
                          Number(recipe.rating.rateCount)
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='tags'>
                    {recipe.nutritionLabels.slice(0, 4).map(tag => {
                      return (
                        <div className='tag' key={tag}>
                          {tag}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </form>
  )
}

export default SearchRecipesInput
