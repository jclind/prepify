import React from 'react'
import './Directions.scss'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

const skeletonColor = '#d6d6d6'

const Directions = ({ directions, loading }) => {
  let stepNum = 0

  return (
    <div className='directions'>
      <h3 className='title'>
        {loading ? (
          <Skeleton baseColor={skeletonColor} width={163} height={32} />
        ) : (
          'Directions:'
        )}
      </h3>
      <div className='directions-lists'>
        {!loading ? (
          directions.map((directionList, idx1) => {
            const isMultiDirection = directions.length > 1
            return (
              <div
                className={
                  isMultiDirection ? 'multi-direction-list list' : 'list'
                }
                key={idx1}
              >
                {isMultiDirection && (
                  <h4 className='title'>
                    <span className='text'>{directionList.name}</span>
                    <div className='divider'></div>
                  </h4>
                )}
                {directionList.list.map((direction, idx2) => {
                  stepNum++
                  return (
                    <div className='direction' key={direction.id}>
                      <div className='number-container'>
                        <div className='number'>{stepNum}</div>
                      </div>
                      <div className='content'>{direction.content}</div>
                    </div>
                  )
                })}
              </div>
            )
          })
        ) : (
          <div className='list'>
            <div className='direction'>
              <div className='number-container'>
                <Skeleton
                  baseColor={skeletonColor}
                  className='number skeleton'
                />
              </div>
              <Skeleton
                baseColor={skeletonColor}
                count={3}
                className='content skeleton'
              />
            </div>
            <div className='direction'>
              <div className='number-container'>
                <Skeleton
                  baseColor={skeletonColor}
                  className='number skeleton'
                />
              </div>
              <Skeleton
                baseColor={skeletonColor}
                count={3}
                className='content skeleton'
              />
            </div>
            <div className='direction'>
              <div className='number-container'>
                <Skeleton
                  baseColor={skeletonColor}
                  className='number skeleton'
                />
              </div>
              <Skeleton
                baseColor={skeletonColor}
                count={3}
                className='content skeleton'
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Directions
