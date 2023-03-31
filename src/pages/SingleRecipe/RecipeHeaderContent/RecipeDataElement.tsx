import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'

const skeletonColor = '#d6d6d6'

type RecipeDataElementProps = {
  loading: boolean
  icon: React.ReactNode
  title: string
  data?: React.ReactNode
}

const RecipeDataElement: FC<RecipeDataElementProps> = ({
  loading,
  icon,
  title,
  data,
}) => {
  return (
    <div className='data-element'>
      {loading || !data ? (
        <Skeleton baseColor={skeletonColor} className='skeleton' />
      ) : (
        <>
          {icon}
          <h3>{title}</h3>
          <div className='data'>{data}</div>
        </>
      )}
    </div>
  )
}

export default RecipeDataElement
