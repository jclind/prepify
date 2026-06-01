import React from 'react'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'

interface ServingSizeInputProps {
  servings: number | ''
  setServings: (value: number | '') => void
  invalid?: boolean
  describedBy?: string
}

const ServingSizeInput: React.FC<ServingSizeInputProps> = ({
  servings,
  setServings,
  invalid,
  describedBy,
}) => {
  const handleChange = (inputVal: number | '') => {
    if (
      inputVal === '' ||
      (!isNaN(inputVal) &&
        inputVal % 1 === 0 &&
        inputVal >= 1 &&
        inputVal <= 99)
    ) {
      setServings(inputVal)
    }
  }

  return (
    <RecipeFormInput
      type='number'
      placeholder='How many servings does your recipe make?'
      val={servings}
      setVal={(val: number | '') => handleChange(val)}
      invalid={invalid}
      describedBy={describedBy}
    />
  )
}

export default ServingSizeInput
