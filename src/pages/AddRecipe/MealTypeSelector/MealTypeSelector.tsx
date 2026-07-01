import React, { FC } from 'react'
import Select, { ActionMeta, MultiValue } from 'react-select'
import mealTypesList from 'src/recipeData/mealTypesList'
import { recipeSelectStyles } from 'src/pages/AddRecipe/recipeSelectStyles'

type OptionType = {
  value: string
  label: string
}

const mealTypeOptions: OptionType[] = mealTypesList.map(m => ({
  value: m,
  label: m,
}))

type MealTypeSelectorProps = {
  mealTypes: string[]
  setMealTypes: React.Dispatch<React.SetStateAction<string[]>>
}
const getMealTypesByString = (mealTypesString: string[]): OptionType[] => {
  const matchingMealTypes = mealTypeOptions.filter(option =>
    mealTypesString.includes(option.value)
  )

  return matchingMealTypes
}

const MealTypeSelector: FC<MealTypeSelectorProps> = ({
  mealTypes,
  setMealTypes,
}) => {
  const handleChange = (
    newValue: MultiValue<OptionType> | null,
    actionMeta: ActionMeta<OptionType>
  ) => {
    if (newValue) {
      const newValues = newValue.map((value: OptionType) => value.value)
      setMealTypes(newValues)
    } else {
      setMealTypes([])
    }
  }

  return (
    <div>
      <Select
        value={getMealTypesByString(mealTypes)}
        isMulti={true}
        onChange={handleChange}
        options={mealTypeOptions}
        styles={recipeSelectStyles}
        placeholder='Select meal type(s)...'
        closeMenuOnSelect={false}
        aria-label='Course'
      />
    </div>
  )
}

export default MealTypeSelector
