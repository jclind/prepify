import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { RecipeType } from 'types'

const skeletonColor = '#d6d6d6'

type TagsProps = {
  loading: boolean
  currRecipe: RecipeType | null
}

const Tags: FC<TagsProps> = ({ loading, currRecipe }) => {
  return (
    <div className='tags-container'>
      <label className='tag-label'>
        {loading ? <Skeleton baseColor={skeletonColor} width={50} /> : 'Tags:'}
      </label>
      {!loading ? (
        <div className='tags'>
          {currRecipe &&
            currRecipe.nutritionLabels &&
            currRecipe.nutritionLabels.map(tag => {
              return (
                <div className='tag' key={tag}>
                  {tag}
                </div>
              )
            })}
        </div>
      ) : (
        <div className='tags'>
          <Skeleton baseColor={skeletonColor} className='tag skeleton' />
          <Skeleton baseColor={skeletonColor} className='tag skeleton' />
          <Skeleton baseColor={skeletonColor} className='tag skeleton' />
        </div>
      )}
    </div>
  )
}

export default Tags
