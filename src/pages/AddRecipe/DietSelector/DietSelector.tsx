import React, { FC } from 'react'
import Select, { ActionMeta, MultiValue, StylesConfig } from 'react-select'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import styles from 'src/_exports.module.scss'

type OptionType = {
  value: string
  label: string
}

const customStyles: StylesConfig<OptionType> = {
  // Lift the open menu above the sticky summary bar (z-index 50), matching the
  // Course/Cuisine selectors which sit in the same region of the form.
  menu: (provided: any) => ({ ...provided, zIndex: 60 }),
  control: (provided: any, state: any) => ({
    ...provided,
    borderColor: state.isFocused ? styles.primary : provided.borderColor,
    borderWidth: '2px',
    backgroundColor: 'none',
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
        styles={customStyles}
        placeholder='Select diet tag(s)...'
        closeMenuOnSelect={false}
      />
    </div>
  )
}

export default DietSelector
