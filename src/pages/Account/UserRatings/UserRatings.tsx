import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Select, { SingleValue } from 'react-select'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'
import StarRating from 'src/Components/StarRating/StarRating'
import './UserRatings.scss'
import { timeElapsedSince } from 'src/util/timeElapsedSince'
import Skeleton from 'react-loading-skeleton'
import { useNavigate } from 'react-router-dom'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'

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
            <StarRating
              rating={Number(review?.rating)}
              size={16}
              spacing={1}
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

type OptionType = { value: string; label: string }

const options: OptionType[] = [
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
const Ratings: FC = () => {
  const [reviews, setReviews] = useState<OptionalReviewType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)

  const [selectOption, setSelectOption] = useState(options[0])

  const { data, isLoading } = useQuery({
    queryKey: ['user-reviews', selectOption.value, currPage],
    queryFn: () =>
      RecipeAPI.getSingleUserReviews(currPage, 5, selectOption.value, true),
  })
  const showSkeleton = useDelayedLoading(isLoading)

  useEffect(() => {
    if (data) {
      if (currPage === 0) {
        setReviews([...data.reviews])
        setIsMoreReviews(Number(data.totalCount) > data.reviews.length)
      } else {
        const updated = [...reviews, ...data.reviews]
        setReviews(updated)
        setIsMoreReviews(Number(data.totalCount) > updated.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleSelectChange = (e: SingleValue<OptionType>) => {
    if (!e) return
    setSelectOption(e)
    setCurrPage(0)
  }
  const handleLoadMoreReviews = () => {
    setCurrPage(prev => prev + 1)
  }

  // On the first load, hold an empty frame while a fast query settles, so the
  // skeleton only shows for genuinely slow loads — and the empty state never
  // flashes before data. Scoped to the initial load so paging never blanks the
  // already-rendered list.
  if (isLoading && !showSkeleton && reviews.length === 0) {
    return <div className='user-ratings' />
  }

  return (
    <div className='user-ratings'>
      {reviews.length > 0 || isLoading ? (
        <>
          <div className='saved-filters'>
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
            {isLoading ? (
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
                    loading={isLoading}
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
