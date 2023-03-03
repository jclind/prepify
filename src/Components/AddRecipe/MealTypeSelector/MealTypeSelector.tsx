import React, { FC, useState } from 'react'
import Select, { MultiValue, SingleValue } from 'react-select'
import cuisinesList from 'src/recipeData/cuisinesList'
import mealTypesList from 'src/recipeData/mealTypesList'
import styles from '../../../_exports.scss'

type OptionType = {
  value: string
  label: string
}

const mealTypeOptions: OptionType[] = mealTypesList.map(m => ({
  value: m,
  label: m,
}))

const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    borderColor: state.isFocused ? styles.primary : provided.borderColor,
    borderWidth: '2px',
    '&:hover': {
      borderColor: 'primary',
    },
    boxShadow: 'none',
    fontWeight: '500',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? styles.primary : 'transparent',
    color: state.isSelected ? 'white' : 'inherit',
    fontWeight: '500',
    '&:hover': {
      backgroundColor: state.isSelected ? 'primary' : 'lightgray',
      color: state.isSelected ? 'white' : 'inherit',
    },
  }),
}

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
    actionMeta: any
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
        styles={customStyles}
        placeholder='Select a cuisine...'
        closeMenuOnSelect={false}
      />
    </div>
  )
}

export default MealTypeSelector
