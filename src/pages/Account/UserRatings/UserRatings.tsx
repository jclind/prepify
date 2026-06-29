import { CornerDownRightIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import EmptyState from 'src/Components/EmptyState/EmptyState'
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
  const go = () => !loading && navigate(`/recipes/${review?.recipeId}`)

  // A non-<button> wrapper (role=button) so the nested, non-interactive
  // StarRating <button>s aren't invalid-HTML descendants of a <button>.
  return (
    <div
      className='single-review'
      role='button'
      tabIndex={loading ? -1 : 0}
      aria-disabled={loading || undefined}
      onClick={go}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !loading) {
          e.preventDefault()
          go()
        }
      }}
    >
      <div className='sr-thumb'>
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
      <div className='sr-body'>
        <div className='sr-line'>
          {loading ? (
            <Skeleton baseColor={skeletonColor} width={'18ch'} height={18} />
          ) : (
            <>
              <h4 className='sr-title'>{review?.recipeTitle}</h4>
              <span className='sr-date'>
                {timeElapsedSince(review?.ratingLastUpdated ?? '')}
              </span>
            </>
          )}
        </div>
        <div className='sr-sub'>
          {loading ? (
            <Skeleton baseColor={skeletonColor} width={'12ch'} height={16} />
          ) : (
            <>
              <StarRating
                rating={Number(review?.rating)}
                size={14}
                spacing={1}
              />
              <span className='sr-num'>
                {Number(review?.rating).toFixed(1)}
              </span>
            </>
          )}
        </div>
        {!loading && review?.reviewText && (
          <p className='sr-text'>
            <CornerDownRightIcon /> {review?.reviewText}
          </p>
        )}
      </div>
    </div>
  )
}

const skeletonColor = '#d6d6d6'
// Default order: most recently rated first. (The sort control was removed for
// now; the query keeps this fixed order.)
const SORT = 'newAdd'
const Ratings: FC = () => {
  const [reviews, setReviews] = useState<OptionalReviewType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['user-reviews', SORT, currPage],
    queryFn: () => RecipeAPI.getSingleUserReviews(currPage, 5, SORT, true),
  })
  const showSkeleton = useDelayedLoading(isLoading)
  // `reviews` is populated by the effect below one render AFTER react-query
  // flips `isLoading` to false, so on a fast load there's a frame where the
  // query has settled but `reviews` is still []. Gate the list on the resolved
  // payload too (`data.reviews`) so that frame keeps showing the list instead
  // of flashing the "no ratings" empty state.
  const dataHasReviews = !!data && data.reviews.length > 0
  const showList = reviews.length > 0 || isLoading || dataHasReviews

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
      {showList ? (
        <>
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
        <EmptyState
          icon={<StarOutlineIcon />}
          title='No Ratings Yet'
          description='All of your future ratings will show up here.'
          action={{ label: 'Find recipes to review', to: '/recipes' }}
        />
      )}
    </div>
  )
}

export default Ratings
