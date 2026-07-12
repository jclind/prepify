import React from 'react'
import FormInput from 'src/Components/Form/FormInput'

interface ServingSizeInputProps {
  // The raw field string (empty until the user types). Numeric coercion is the
  // caller's job at submit time (useRecipeForm's `Number(servings)`) — storing
  // the raw string keeps the field byte-identical to what was typed and avoids a
  // `number` type that's a lie for a DOM-string value.
  servings: string
  setServings: (value: string) => void
  invalid?: boolean
  describedBy?: string
}

const ServingSizeInput: React.FC<ServingSizeInputProps> = ({
  servings,
  setServings,
  invalid,
  describedBy,
}) => {
  const handleChange = (raw: string) => {
    const num = Number(raw)
    if (
      raw === '' ||
      (!isNaN(num) && num % 1 === 0 && num >= 1 && num <= 99)
    ) {
      // Store the raw string as typed; submit-time Number() does the coercion.
      setServings(raw)
    }
  }

  return (
    <FormInput
      size='compact'
      type='number'
      placeholder='How many servings does your recipe make?'
      val={servings}
      setVal={handleChange}
      invalid={invalid}
      describedBy={describedBy}
    />
  )
}

export default ServingSizeInput
