import React from 'react'
import './Directions.scss'

const Directions = ({ directions }) => {
  let stepNum = 0

  return (
    <div className='directions'>
      <h3 className='title'>Directions:</h3>
      <div className='directions-lists'>
        {directions.map((directionList, idx1) => {
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
        })}
      </div>
    </div>
  )
}

export default Directions
