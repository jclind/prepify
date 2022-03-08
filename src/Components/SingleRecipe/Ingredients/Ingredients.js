import React, { useState, useEffect } from 'react'
import './Ingredients.scss'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

const skeletonColor = '#d6d6d6'

const CheckBox = ({ ingr, loading }) => {
  const [checked, setChecked] = useState(false)

  const handleOnClick = () => {
    if (!loading) {
      setChecked(!checked)
    }
  }
  return (
    <div className='ingredient' onClick={handleOnClick}>
      {loading ? (
        <Skeleton baseColor={skeletonColor} width={400} />
      ) : (
        <>
          <input
            type='checkbox'
            checked={checked}
            className='ingredient-checkbox'
            onChange={() => {}}
          />
          <label>
            <strong>
              {ingr.quantity} {ingr.measurement.value}
            </strong>{' '}
            {ingr.name}
          </label>
        </>
      )}
    </div>
  )
}

const Ingredients = ({ ingredients, yieldSize, setYieldSize, loading }) => {
  const [modYieldSize, setModYieldSize] = useState(yieldSize)

  useEffect(() => {
    setModYieldSize(yieldSize)
  }, [yieldSize])

  const decYieldSize = () => {
    const num = Number(modYieldSize)
    if (num > 1) {
      setYieldSize(num - 1)
      setModYieldSize(num - 1)
    }
  }
  const incYieldSize = () => {
    const num = Number(modYieldSize)
    setYieldSize(num + 1)
    setModYieldSize(num + 1)
  }

  const handleServingsBlur = e => {
    const val = e.target.value
    if (val && !isNaN(val) && val > 0) {
      setYieldSize(modYieldSize)
    } else {
      setModYieldSize(yieldSize)
    }
  }
  const handleServingsOnChange = e => {
    if (
      (e.target.value % 1 === 0 || e.target.value === '') &&
      !e.target.value.toString().includes('.')
    ) {
      setModYieldSize(e.target.value)
    }
  }

  return (
    <div className='ingredients'>
      <div className='header'>
        <h3 className='title'>
          {loading ? (
            <Skeleton baseColor={skeletonColor} className='skeleton' />
          ) : (
            'Ingredients:'
          )}
        </h3>
        <div className='servings'>
          {loading ? (
            <Skeleton baseColor={skeletonColor} className='skeleton' />
          ) : (
            <>
              <div className='content'>
                <button
                  type='button'
                  className='dec counter-btn btn'
                  onClick={decYieldSize}
                >
                  -
                </button>
                <input
                  value={modYieldSize}
                  type='tel'
                  onChange={handleServingsOnChange}
                  onBlur={handleServingsBlur}
                />
                <button
                  type='button'
                  className='inc counter-btn btn'
                  onClick={incYieldSize}
                >
                  +
                </button>
              </div>
              <div className='text'>Servings</div>
            </>
          )}
        </div>
      </div>
      <div className='ingredients-lists'>
        {!loading && ingredients.length > 0 ? (
          ingredients.map((ingredientList, idx) => {
            const isMultiIngr = ingredients.length > 1
            return (
              <div
                className={isMultiIngr ? 'multi-ingredient-list list' : 'list'}
                key={idx}
              >
                {isMultiIngr && (
                  <h4 className='title'>
                    <span className='text'>{ingredientList.name}</span>
                    <div className='divider'></div>
                  </h4>
                )}
                {ingredientList.list.map(ingr => {
                  return (
                    <div key={ingr.id}>
                      <CheckBox ingr={ingr} />
                    </div>
                  )
                })}
              </div>
            )
          })
        ) : (
          <>
            <CheckBox ingr={null} loading={true} />
            <CheckBox ingr={null} loading={true} />
            <CheckBox ingr={null} loading={true} />
            <CheckBox ingr={null} loading={true} />
            <CheckBox ingr={null} loading={true} />
          </>
        )}
      </div>
    </div>
  )
}

export default Ingredients
