import React, { ChangeEvent } from 'react'
import RecipeFormInput from '../RecipeFormInput'

interface ServingSizeInputProps {
  servings: number | ''
  setServings: (value: number | '') => void
}

const ServingSizeInput: React.FC<ServingSizeInputProps> = ({
  servings,
  setServings,
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
    />
  )
}

export default ServingSizeInput
