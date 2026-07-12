import React, { FC } from 'react'
import Select, { ActionMeta, MultiValue } from 'react-select'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import { recipeSelectStyles } from 'src/pages/AddRecipe/recipeSelectStyles'

type OptionType = {
  value: string
  label: string
}

type DietSelectorProps = {
  nutritionLabels: string[]
  setNutritionLabels: React.Dispatch<React.SetStateAction<string[]>>
}

// Map the stored label values (e.g. 'GLUTEN_FREE') back to their option objects
// so the control shows the friendly labels when editing an existing recipe.
const getDietLabelsByValue = (values: string[]): OptionType[] =>
  dietLabelsOptions.filter(option => values.includes(option.value))

const DietSelector: FC<DietSelectorProps> = ({
  nutritionLabels,
  setNutritionLabels,
}) => {
  const handleChange = (
    newValue: MultiValue<OptionType> | null,
    _actionMeta: ActionMeta<OptionType>
  ) => {
    if (newValue) {
      setNutritionLabels(newValue.map(option => option.value))
    } else {
      setNutritionLabels([])
    }
  }

  return (
    <div>
      <Select
        value={getDietLabelsByValue(nutritionLabels)}
        isMulti={true}
        onChange={handleChange}
        options={dietLabelsOptions}
        styles={recipeSelectStyles}
        placeholder='Select diet tag(s)...'
        closeMenuOnSelect={false}
        aria-label='Diet'
      />
    </div>
  )
}

export default DietSelector
