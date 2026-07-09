import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import 'react-loading-skeleton/dist/skeleton.css'

// Mirrors the real RecipeReview card (head: 40px avatar + two identity lines +
// date, then a stars line and a couple of text lines) inside `.recipe-review`,
// so the warm card border/padding and mobile wrap all match what loads in — no
// shift on swap. Shared by the page-level loading skeleton (SingleRecipe) and
// the in-list skeleton (RatingsAndReviews) so both stay identical.
const ReviewCardSkeleton: FC<{ count?: number }> = ({ count = 2 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div className='recipe-review' key={i} aria-hidden='true'>
        <div className='head'>
          <Skeleton
            circle
            inline
            baseColor={skeletonColor}
            containerClassName='avatar'
            height={40}
            width={40}
          />
          <div className='rr-who'>
            <div className='rr-nm'>
              <Skeleton inline baseColor={skeletonColor} width={110} height={13} />
            </div>
            <div className='rr-sub'>
              <Skeleton inline baseColor={skeletonColor} width={84} height={11} />
            </div>
          </div>
          <span className='rr-dt'>
            <Skeleton inline baseColor={skeletonColor} width={70} height={11} />
          </span>
        </div>
        <div className='stars'>
          <Skeleton inline baseColor={skeletonColor} width={84} height={12} />
        </div>
        <div className='text'>
          <Skeleton baseColor={skeletonColor} count={2} width='95%' />
        </div>
      </div>
    ))}
  </>
)

export default ReviewCardSkeleton
