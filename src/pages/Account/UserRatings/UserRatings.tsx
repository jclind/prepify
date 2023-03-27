import React, { FC, useEffect, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType } from 'types'
import { selectCustomStyles } from '../selectCustomStyles'
import StarRatings from 'react-star-ratings'
import './UserRatings.scss'
import { timeElapsedSince } from 'src/util/timeElapsedSince'
import Skeleton from 'react-loading-skeleton'
import { useNavigate } from 'react-router-dom'

type SingleReviewProps = {
  review?: OptionalReviewType
  loading: boolean
}
const SingleReview: FC<SingleReviewProps> = ({ review, loading }) => {
  const navigate = useNavigate()

  return (
    <button
      className='single-review'
      disabled={loading}
      onClick={() => !loading && navigate(`/recipes/${review?.recipeId}`)}
    >
      <div className='recipe-data-container'>
        <div className='img-container'>
          {loading ? (
            <Skeleton className='img' baseColor={skeletonColor} />
          ) : (
            <img
              className='img'
              src={review?.recipeImage}
              alt={review?.recipeTitle}
            />
          )}
        </div>
        {loading ? (
          <Skeleton baseColor={skeletonColor} width={'30ch'} height={'25px'} />
        ) : (
          <h4>{review?.recipeTitle}</h4>
        )}
      </div>
      <div className='star-rating-container'>
        {loading ? (
          <Skeleton baseColor={skeletonColor} width={'20ch'} height={'22px'} />
        ) : (
          <>
            <StarRatings
              rating={Number(review?.rating)}
              starRatedColor='#ff5722'
              starDimension='16px'
              starSpacing='1px'
              name='rating'
            />
            <div className='date'>
              {timeElapsedSince(review?.ratingLastUpdated ?? '')}
            </div>
          </>
        )}
      </div>
      {!loading && review?.reviewText && (
        <div className='review-text'>{review?.reviewText}</div>
      )}
    </button>
  )
}

const options = [
  // { value: 'popular', label: 'Popular' },
  // { value: 'new', label: 'Recipe Date: Newest' },
  // { value: 'old', label: 'Recipe Date: Oldest' },
  // { value: 'shortest', label: 'Time: Shortest' },
  // { value: 'longest', label: 'Time: Longest' },
  { value: 'newAdd', label: 'Save Time: Recent' },
  { value: 'oldAdd', label: 'Save Time: Oldest' },
  { value: 'positive', label: 'Rating: Most Positive' },
  { value: 'negative', label: 'Rating: Least Positive' },
]
const skeletonColor = '#d6d6d6'
const Ratings = () => {
  const [reviews, setReviews] = useState<OptionalReviewType[]>([])
  const [page, setPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(true)

  const [selectOption, setSelectOption] = useState(options[0])
  const [loading, setLoading] = useState(true)

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
              setIsMoreReviews(true)
            } else {
              setIsMoreReviews(false)
            }

            setPage(recipesPage + 1)
          }
          setLoading(false)
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
      {reviews.length > 0 || loading ? (
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
            {loading ? (
              <>
                <SingleReview loading={true} />
                <SingleReview loading={true} />
              </>
            ) : (
              reviews.map(review => {
                return (
                  <SingleReview
                    key={review._id}
                    review={review}
                    loading={loading}
                  />
                )
              })
            )}
          </div>
          {isMoreReviews && reviews.length > 0 ? (
            <button
              className='load-more-btn btn'
              onClick={handleLoadMoreReviews}
            >
              Load More Reviews
            </button>
          ) : null}
        </>
      ) : (
        <div className='no-data-saved'>
          <h2>No Ratings Yet</h2>
          <p>All of your future ratings will show up here</p>
        </div>
      )}
    </div>
  )
}

export default Ratings
