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
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import { useNavigate } from 'react-router-dom'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'

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
        {/* Mirror each real element (title / date / rating / text) inside its own
            wrapper so the skeleton inherits the same line-heights and the row is
            the same height as a loaded review by construction (the 2-line text is
            the part the old thumb-only skeleton was missing — it left review rows
            ~30px short). See docs/design/loading-states.md. */}
        <div className='sr-line'>
          {loading ? (
            <>
              <h4 className='sr-title'>
                <Skeleton inline baseColor={skeletonColor} width={'65%'} />
              </h4>
              <span className='sr-date'>
                <Skeleton inline baseColor={skeletonColor} width={52} />
              </span>
            </>
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
            <Skeleton inline baseColor={skeletonColor} width={92} height={14} />
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
        {loading ? (
          <p className='sr-text sr-text--skeleton'>
            <Skeleton baseColor={skeletonColor} count={2} width={'95%'} />
          </p>
        ) : review?.reviewText ? (
          <p className='sr-text'>
            <CornerDownRightIcon /> {review?.reviewText}
          </p>
        ) : null}
      </div>
    </div>
  )
}

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

  return (
    <div className='user-ratings'>
      {showList ? (
        <>
          {/* Render the skeleton rows whenever loading so the list reserves its
              height from frame 1; the flash-guard delay only hides them (sk-hold)
              until it's worth drawing — no blank-then-grow jump. */}
          <div
            className={`thumbnails-container ${
              isLoading && !showSkeleton ? 'sk-hold' : ''
            }`}
          >
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
