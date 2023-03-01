import React from 'react'
import { IngredientsType } from 'types'
import { AiOutlineMenu } from 'react-icons/ai'

type IngredientItemProps = {
  ingredient: IngredientsType
  reorderActive?: boolean
}
const IngredientItem = ({ ingredient, reorderActive }: IngredientItemProps) => {
  return (
    <button>
      {reorderActive && (
        <div className='handler'>
          <AiOutlineMenu />
        </div>
      )}
      {'parsedIngredient' in ingredient ? (
        <div className='container'>
          <div className='img-container'>
            <img src={ingredient.ingredientData?.imagePath} alt='' />
          </div>
        </div>
      ) : null}
    </button>
  )
}

type IngredientListProps = {
  ingredients: IngredientsType[]
}
const IngredientList = ({ ingredients }: IngredientListProps) => {
  return (
    <div>
      {ingredients.map(ingr => {
        return <IngredientItem ingredient={ingr} reorderActive={false} />
      })}
    </div>
  )
}

export default IngredientList
