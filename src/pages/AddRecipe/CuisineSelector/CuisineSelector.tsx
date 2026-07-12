import React, { FC } from 'react'
import Select, { SingleValue } from 'react-select'
import cuisinesList from 'src/recipeData/cuisinesList'
import { recipeSelectStyles } from 'src/pages/AddRecipe/recipeSelectStyles'

type OptionType = {
  value: string
  label: string
}

const cuisineOptions: OptionType[] = cuisinesList.map(c => ({
  value: c,
  label: c,
}))
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
    setCuisine(option?.value ?? '')
  }

  return (
    <div>
      <Select<OptionType, false>
        value={getCuisineByString(cuisine)}
        onChange={handleChange}
        options={cuisineOptions}
        styles={recipeSelectStyles}
        placeholder='Select a cuisine...'
        aria-label='Cuisine'
      />
    </div>
  )
}

export default CuisineSelector
