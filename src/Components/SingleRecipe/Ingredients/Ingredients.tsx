import React, { useState, useEffect } from 'react'
import './Ingredients.scss'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { IngredientsType } from 'types'
import { closestFraction } from 'src/util/validateIngredientQuantityStr'
import { CiShoppingBasket } from 'react-icons/ci'
import IngredientItemText from 'src/Components/IngredientItemText/IngredientItemText'

const skeletonColor = '#d6d6d6'

type IngredientItemProps = {
  ingr: IngredientsType | null
  loading: boolean
}
const IngredientItem = ({ ingr, loading }: IngredientItemProps) => {
  const [checked, setChecked] = useState(false)

  const handleOnClick = () => {
    if (!loading) {
      setChecked(!checked)
    }
  }
  if (loading || !ingr) {
    return <Skeleton baseColor={skeletonColor} width={400} />
  } else if ('parsedIngredient' in ingr) {
    return (
      <div
        className={`ingredient ${checked ? 'checked' : ''}`}
        onClick={handleOnClick}
      >
        <input
          type='checkbox'
          checked={checked}
          className='ingredient-checkbox'
          onChange={() => {}}
        />
        <label>
          <div className='img-container'>
            {ingr?.ingredientData?.imagePath ? (
              <img
                className='img'
                src={ingr.ingredientData.imagePath}
                alt={ingr.parsedIngredient.ingredient ?? ''}
              />
            ) : (
              <CiShoppingBasket className='img no-img' />
            )}
          </div>
          <div className='text-container'>
            <IngredientItemText
              quantity={ingr.parsedIngredient.quantity}
              unit={ingr.parsedIngredient.unit}
              ingredientName={ingr.parsedIngredient.ingredient}
              comment={ingr.parsedIngredient.comment}
            />
          </div>
        </label>
      </div>
    )
  } else {
    return (
      <div className='ingredient' onClick={handleOnClick}>
        <h1>{ingr.label}</h1>
      </div>
    )
  }
}

type IngredientsProps = {
  ingredients: IngredientsType[]
  servingSize: number
  setServingSize: (size: number) => void
  loading: boolean
}

const Ingredients = ({
  ingredients,
  servingSize,
  setServingSize,
  loading,
}: IngredientsProps) => {
  const [modServingSize, setModServingSize] = useState(servingSize)

  useEffect(() => {
    setModServingSize(servingSize)
  }, [servingSize])

  const decYieldSize = () => {
    const num = Number(modServingSize)
    if (num > 1) {
      setServingSize(num - 1)
      setModServingSize(num - 1)
    }
  }
  const incYieldSize = () => {
    const num = Number(modServingSize)
    setServingSize(num + 1)
    setModServingSize(num + 1)
  }

  const handleServingsBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val: string = e.target.value
    if (val) {
      setServingSize(modServingSize)
    } else {
      setModServingSize(servingSize)
    }
  }
  const handleServingsOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val: number = Number(e.target.value)
    if (val % 1 === 0 && !e.target.value.toString().includes('.')) {
      setModServingSize(val)
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
                  value={modServingSize}
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
          ingredients.map(ingr => {
            return <IngredientItem ingr={ingr} loading={false} key={ingr.id} />
          })
        ) : (
          <>
            <IngredientItem ingr={null} loading={true} />
            <IngredientItem ingr={null} loading={true} />
            <IngredientItem ingr={null} loading={true} />
            <IngredientItem ingr={null} loading={true} />
            <IngredientItem ingr={null} loading={true} />
          </>
        )}
      </div>
    </div>
  )
}

export default Ingredients
