import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import { RecipeType } from 'types'
import { Link } from 'react-router-dom'

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
                <Link className='tag' key={tag} to={`/recipes?dietTags=${tag}`}>
                  {tag}
                </Link>
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
