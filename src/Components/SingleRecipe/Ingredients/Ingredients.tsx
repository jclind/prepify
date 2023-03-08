import React, { useState, useEffect, useRef } from 'react'
import './Ingredients.scss'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { IngredientsType } from 'types'
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
        {/* Remove all colons from label (to be added by css) */}
        <h4 className='ingredient-label'>{ingr.label.replace(/:/g, '')}</h4>
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

  const servingsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setModServingSize(servingSize)
    // console.log(ingredients)
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

  const handleServingsBlur = () => {
    if (modServingSize > 0 && modServingSize < 100) {
      setServingSize(modServingSize)
    } else {
      setModServingSize(servingSize)
    }
    servingsInputRef?.current && servingsInputRef.current.blur()
  }
  const handleServingsOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val: number = Number(e.target.value)
    if (val % 1 === 0 && !e.target.value.toString().includes('.')) {
      setModServingSize(val)
    }
  }

  return (
    <div className='recipe-page ingredients'>
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
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleServingsBlur()
                  }}
                  ref={servingsInputRef}
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
