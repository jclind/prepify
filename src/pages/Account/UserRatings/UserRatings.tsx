import { AlertCircleIcon, ChevronDownIcon, CornerDownRightIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import './UserRatings.scss'
import { timeElapsedSince } from 'src/util/timeElapsedSince'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import { useNavigate } from 'react-router-dom'
import { usePaginatedLoadMore } from 'src/pages/Account/usePaginatedLoadMore'

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
  // `showList` stays true across the one-frame gap where the query has settled
  // but the accumulator hasn't populated `reviews` yet, so the "no ratings"
  // empty state can't flash before a genuine zero result.
  const {
    items: reviews,
    isLoading,
    showSkeleton,
    isError,
    refetch,
    isMore: isMoreReviews,
    showList,
    loadMore: handleLoadMoreReviews,
  } = usePaginatedLoadMore<OptionalReviewType>({
    queryKey: page => ['user-reviews', SORT, page],
    queryFn: page =>
      RecipeAPI.getSingleUserReviews(page, 5, SORT, true).then(
        d => d && { items: d.reviews, totalCount: d.totalCount }
      ),
  })

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
              className='load-more-btn'
              onClick={handleLoadMoreReviews}
            >
              Load more reviews <ChevronDownIcon />
            </button>
          ) : null}
        </>
      ) : isError ? (
        // Error is not empty: a failed fetch must never read as "no ratings" to
        // a user who has them. See docs/design/loading-states.md.
        <EmptyState
          icon={<AlertCircleIcon />}
          title='Couldn’t load your ratings'
          description='Something went wrong. Please try again.'
          action={{ label: 'Try again', onClick: () => refetch() }}
        />
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
