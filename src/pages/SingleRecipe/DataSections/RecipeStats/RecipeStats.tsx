import React, { FC } from 'react'
import { AiOutlineEye } from 'react-icons/ai'
import { BsBookmark, BsCheck2Circle, BsStarFill } from 'react-icons/bs'
import { RecipeType } from 'types'
import './RecipeStats.scss'

type RecipeStatsProps = {
  currRecipe: RecipeType | null
  loading: boolean
}

const formatCount = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString()

const RecipeStats: FC<RecipeStatsProps> = ({ currRecipe, loading }) => {
  if (loading || !currRecipe) return null

  const views = currRecipe.views ?? 0
  const numTimesSaved = currRecipe.numTimesSaved ?? 0
  const numTimesMade = currRecipe.numTimesMade ?? 0
  const rateValue = currRecipe.rating?.rateValue ?? 0
  const rateCount = currRecipe.rating?.rateCount ?? 0

  return (
    <div className='recipe-stats-foot'>
      <div className='stats-minimal' aria-label='Recipe statistics'>
        <span className='stat'>
          <AiOutlineEye className='icon' aria-hidden='true' />
          <b>{formatCount(views)}</b> {views === 1 ? 'view' : 'views'}
        </span>
        <span className='sep' aria-hidden='true'>
          ·
        </span>
        <span className='stat'>
          <BsBookmark className='icon' aria-hidden='true' />
          <b>{formatCount(numTimesSaved)}</b>{' '}
          {numTimesSaved === 1 ? 'save' : 'saves'}
        </span>
        <span className='sep' aria-hidden='true'>
          ·
        </span>
        <span className='stat'>
          <BsCheck2Circle className='icon' aria-hidden='true' />
          <b>{formatCount(numTimesMade)}</b> made
        </span>
        <span className='sep' aria-hidden='true'>
          ·
        </span>
        <span className='stat'>
          <BsStarFill className='icon star' aria-hidden='true' />
          {rateCount > 0 ? (
            <>
              <b>{rateValue.toFixed(1)}</b> ({formatCount(rateCount)})
            </>
          ) : (
            <>
              <b>—</b> no ratings
            </>
          )}
        </span>
      </div>
    </div>
  )
}

export default RecipeStats
