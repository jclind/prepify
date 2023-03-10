import React, { useEffect, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType, ReviewType } from 'types'
import { selectCustomStyles } from '../selectCustomStyles'
import './UserRatings.scss'

const options = [
  // { value: 'popular', label: 'Popular' },
  // { value: 'new', label: 'Recipe Date: Newest' },
  // { value: 'old', label: 'Recipe Date: Oldest' },
  // { value: 'shortest', label: 'Time: Shortest' },
  // { value: 'longest', label: 'Time: Longest' },
  { value: 'newAdd', label: 'Save Time: Recent' },
  { value: 'oldAdd', label: 'Save Time: Oldest' },
]

const Ratings = () => {
  const [reviews, setReviews] = useState<OptionalReviewType[]>([])
  const [page, setPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  const [selectOption, setSelectOption] = useState(options[0])

  const handleGetUserReviews = (recipesPage: number, selectValue: string) => {
    if (recipesPage >= 0 && selectValue) {
      RecipeAPI.getSingleUserReviews(recipesPage, 5, selectValue, true).then(
        res => {
          if (res) {
            const updatedArr =
              recipesPage === 0
                ? [...res.reviews]
                : [...reviews, ...res.reviews]
            setReviews(updatedArr)

            if (Number(res.totalCount) > updatedArr.length) {
              setIsMoreRecipes(true)
            } else {
              setIsMoreRecipes(false)
            }

            setPage(recipesPage + 1)
          }
        }
      )
    }
  }
  useEffect(() => {
    handleGetUserReviews(page, selectOption.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleSelectChange = (
    e: SingleValue<{
      value: string
      label: string
    }>
  ) => {
    if (e) {
      setSelectOption(e)
      setPage(0)
      handleGetUserReviews(0, e.value)
    }
  }
  const handleLoadMoreReviews = () => {
    handleGetUserReviews(page, selectOption.value)
  }

  return (
    <div className='user-ratings'>
      {reviews.length > 0 ? (
        <>
          <div className='saved-filters'>
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
            {reviews.map(review => {
              console.log(review)
              return (
                <div key={review._id}>
                  <h1>{review.recipeTitle}</h1>
                  <img
                    src={review.recipeImage}
                    alt={review.recipeTitle}
                    height={50}
                    width={50}
                  />
                </div>
              )
            })}
            {isMoreRecipes && reviews.length > 0 ? (
              <button
                className='load-more-recipes-btn btn'
                onClick={handleLoadMoreReviews}
              >
                Load More Reviews
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div className='no-recipes-saved'>
          <h2>No Recipes Saved Yet</h2>
          <p>Start saving your favorite recipes today!</p>
        </div>
      )}
    </div>
  )
}

export default Ratings
