import React, { FC } from 'react'
import Select, { SingleValue } from 'react-select'
import cuisinesList from 'src/recipeData/cuisinesList'
import styles from '../../../_exports.scss'

type OptionType = {
  value: string
  label: string
}

const cuisineOptions: OptionType[] = [
  {
    value: '-',
    label: 'Select a cuisine...',
  },
  ...cuisinesList.map(c => ({
    value: c,
    label: c,
  })),
]
const customStyles = {
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

type CuisineSelectorProps = {
  cuisine: string
  setCuisine: React.Dispatch<React.SetStateAction<string>>
}

const getCuisineByString = (cuisineString: string): OptionType | null => {
  const matchingCuisine = cuisineOptions.find(
    option => option.value.toLowerCase() === cuisineString.toLowerCase()
  )

  return matchingCuisine || null
}

const CuisineSelector: FC<CuisineSelectorProps> = ({ cuisine, setCuisine }) => {
  const handleChange = (option: SingleValue<OptionType>) => {
    const value = !option?.value || option.value === '-' ? '' : option.value
    setCuisine(value)
  }

  return (
    <div>
      <Select
        value={getCuisineByString(cuisine)}
        onChange={handleChange}
        options={cuisineOptions}
        styles={customStyles}
        placeholder='Select a cuisine...'
      />
    </div>
  )
}

export default CuisineSelector
