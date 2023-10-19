import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { calculateInflationPrice } from 'src/util/calculateInflationPrices'
import { RecipeType } from 'types'

const skeletonColor = '#d6d6d6'

type DesktopTitleContentProps = {
  loading: boolean
  currRecipe: RecipeType | null
  windowWidth: number
}

const DesktopTitleContent: FC<DesktopTitleContentProps> = ({
  loading,
  currRecipe,
  windowWidth,
}) => {
  if (windowWidth <= 956) return null

  const { servingPrice, recipePrice } = calculateInflationPrice(
    currRecipe?.servingPrice,
    currRecipe?.servings
  )

  return (
    <>
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
          `Serving: $${servingPrice} | Recipe: $${recipePrice}`
        )}
      </div>
      <p className='description'>
        {loading || !currRecipe?.description ? (
          <Skeleton baseColor={skeletonColor} count={4} />
        ) : (
          currRecipe.description
        )}
      </p>
    </>
  )
}

export default DesktopTitleContent
