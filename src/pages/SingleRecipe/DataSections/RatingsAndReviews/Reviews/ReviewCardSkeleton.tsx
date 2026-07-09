import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import 'react-loading-skeleton/dist/skeleton.css'

// Mirrors the real RecipeReview markup (head: name + stars + date, then a couple
// of text lines) inside `.recipe-review`, so the `.recipe-ratings` card styling,
// borders, and mobile wrap all match what loads in — no shift on swap. Shared by
// the page-level loading skeleton (SingleRecipe) and the in-list skeleton
// (ReviewsList) so both stay identical.
const ReviewCardSkeleton: FC<{ count?: number }> = ({ count = 2 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div className='recipe-review' key={i} aria-hidden='true'>
        <div className='head'>
          <Skeleton
            circle
            inline
            baseColor={skeletonColor}
            className='avatar'
            containerClassName='avatar'
            height={34}
            width={34}
          />
          <div className='name-content'>
            <div className='name'>
              <Skeleton inline baseColor={skeletonColor} width={110} />
            </div>
            <div className='rating'>
              <Skeleton inline baseColor={skeletonColor} width={84} />
            </div>
          </div>
          <div className='date'>
            <Skeleton inline baseColor={skeletonColor} width={70} />
          </div>
        </div>
        <div className='body'>
          <div className='text'>
            <Skeleton baseColor={skeletonColor} count={2} width='95%' />
          </div>
        </div>
      </div>
    ))}
  </>
)

export default ReviewCardSkeleton
