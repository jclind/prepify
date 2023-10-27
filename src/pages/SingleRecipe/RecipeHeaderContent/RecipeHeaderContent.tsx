import React, { FC, useEffect, useState } from 'react'
import { AiOutlineClockCircle, AiOutlineUsergroupAdd } from 'react-icons/ai'
import { BsStar } from 'react-icons/bs'
import Skeleton from 'react-loading-skeleton'
import { formatRating } from 'src/util/formatRating'
import { getWindowWidth } from 'src/util/getWindowWidth'
import { RecipeType, ReviewType } from 'types'
import AddRatingBtn from '../Buttons/AddRatingBtn'
import PrintRecipeBtn from '../Buttons/PrintRecipeBtn'
import SaveRecipeBtn from '../Buttons/SaveRecipeBtn'
import DesktopTitleContent from './DesktopTitleContent'
import MobileTitleContent from './MobileTitleContent'
import RecipeDataElement from './RecipeDataElement'

type RecipeHeaderContentProps = {
  loading: boolean
  currRecipe: RecipeType | null
  servingSize: number
  currUserReview: ReviewType | null
  printedRef: React.MutableRefObject<HTMLInputElement>
}

const skeletonColor = '#d6d6d6'

const RecipeHeaderContent: FC<RecipeHeaderContentProps> = ({
  loading,
  currRecipe,
  servingSize,
  currUserReview,
  printedRef,
}) => {
  const [windowWidth, setWindowWidth] = useState(getWindowWidth())

  useEffect(() => {
    function handleResize() {
      setWindowWidth(getWindowWidth())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })

  return (
    <div className='header-content'>
      <MobileTitleContent
        currRecipe={currRecipe}
        loading={loading}
        windowWidth={windowWidth}
      />
      <div className='recipe-image-container'>
        {loading || !currRecipe?.recipeImage ? (
          <Skeleton baseColor={skeletonColor} className='img skeleton' />
        ) : (
          <img
            className='img'
            src={currRecipe.recipeImage}
            alt={currRecipe.title}
            title={currRecipe.title}
            loading='eager'
            height={400}
            width={400}
          />
        )}
      </div>
      <div className='description-content'>
        <DesktopTitleContent
          currRecipe={currRecipe}
          loading={loading}
          windowWidth={windowWidth}
        />
        <div className='recipe-data'>
          <RecipeDataElement
            loading={loading || !currRecipe?.totalTime}
            icon={<AiOutlineClockCircle className='icon' />}
            title='Total Time'
            data={currRecipe?.totalTime && `${currRecipe.totalTime} min.`}
          />
          <RecipeDataElement
            loading={loading}
            icon={<AiOutlineUsergroupAdd className='icon' />}
            title='Servings'
            data={servingSize}
          />
          <RecipeDataElement
            loading={loading}
            icon={<BsStar className='icon' />}
            title='Rating'
            data={
              !currRecipe?.rating?.rateCount
                ? 'No Ratings'
                : `${formatRating(
                    currRecipe.rating.rateValue,
                    currRecipe.rating.rateCount
                  )} (${currRecipe.rating.rateCount})`
            }
          />
        </div>
        <div className='actions'>
          {loading || !currRecipe?._id ? (
            <Skeleton baseColor={skeletonColor} className='action skeleton' />
          ) : (
            <>
              <SaveRecipeBtn recipeId={currRecipe._id} />
              <AddRatingBtn currUserReview={currUserReview} />
              <PrintRecipeBtn printedRef={printedRef} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecipeHeaderContent
