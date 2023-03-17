import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { RecipeType } from 'types'

const skeletonColor = '#d6d6d6'

type MobileTitleContentProps = {
  loading: boolean
  currRecipe: RecipeType | null
  windowWidth: number
}

const MobileTitleContent: FC<MobileTitleContentProps> = ({
  loading,
  currRecipe,
  windowWidth,
}) => {
  if (windowWidth > 956) return null

  return (
    <div className='mobile-title-content'>
      <h1 className='title'>
        {loading || !currRecipe?.title ? (
          <Skeleton baseColor={skeletonColor} />
        ) : (
          currRecipe.title
        )}
      </h1>
      <div className='recipe-price'>
        {loading || !currRecipe?.servingPrice || !currRecipe?.servings ? (
          <Skeleton baseColor={skeletonColor} height={30} />
        ) : (
          `Serving: $${(currRecipe.servingPrice / 100).toFixed(
            2
          )} | Recipe: $${(
            (currRecipe.servingPrice / 100) *
            currRecipe.servings
          ).toFixed(2)}`
        )}
      </div>
      <p className='description'>
        {loading || !currRecipe?.description ? (
          <Skeleton baseColor={skeletonColor} count={4} />
        ) : (
          currRecipe.description
        )}
      </p>
    </div>
  )
}

export default MobileTitleContent
