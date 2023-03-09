import React, { useState, useEffect, FC } from 'react'
import Select, {
  GroupBase,
  InputProps,
  MultiValue,
  SingleValue,
} from 'react-select'
import { useNavigate, useLocation } from 'react-router-dom'
import './RecipeFilters.scss'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import styles from '../../_exports.scss'

type RecipeFiltersProps = {
  options?: { value: string; label: string }[]
  setSelectVal: (val: string) => void
  selectedDietTags: string[]
  setSelectedDietTags: (val: string[]) => void
}
type OptionType = {
  value: string
  label: string
}

const customDietLabelStyles = {
  control: (provided: any) => ({
    ...provided,
    borderRadius: '20px',
    maxHeight: '30px',
    minWidth: '150px',
  }),

  option: (provided: any) => ({
    ...provided,
    fontSize: '0.8rem',
    color: styles.primaryText,
  }),
  singleValue: (provided: any) => ({
    ...provided,
    fontSize: '0.8rem',
    color: styles.primaryText,
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '1px',
    paddingLeft: '5px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    padding: '5px',
    paddingLeft: '0px',
  }),
}

const RecipeFilters: FC<RecipeFiltersProps> = ({
  options,
  setSelectVal,
  selectedDietTags,
  setSelectedDietTags,
}) => {
  const selectSortOptions = options || [
    { value: 'popular', label: 'Popular' },
    { value: 'new', label: 'Date: Newest' },
    { value: 'old', label: 'Date: Oldest' },
    { value: 'cheapest', label: 'Price: Cheapest' },
    { value: 'expensive', label: 'Price: Most Expensive' },
    { value: 'shortest', label: 'Time: Shortest' },
    { value: 'longest', label: 'Time: Longest' },
  ]

  const navigate = useNavigate()
  const location = useLocation()
  let urlParams = new URLSearchParams(location.search)
  const order = urlParams.get('order')
  const defaultSelectValue =
    selectSortOptions.find(el => el.value === order) || selectSortOptions[0]
  const dietTagsParamArr = urlParams.get('dietTags')?.split(',') ?? []
  const defaultDietTagValue = dietLabelsOptions.filter(option =>
    dietTagsParamArr.includes(option.value)
  )
  const [dietSearchVal, setDietSearchVal] = useState('')

  useEffect(() => {
    setSelectVal(selectSortOptions[0].value)
    setSelectedDietTags(dietTagsParamArr)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSortSelectChange = (
    e: SingleValue<{
      value: string
      label: string
    }>
  ) => {
    if (e) {
      const value = e.value
      console.log(value)
      setSelectVal(value)
      urlParams.set('order', value)
      navigate(`/recipes?${urlParams}`)
    }
  }

  const handleDietTagsChange = (
    newValues: MultiValue<OptionType> | null,
    actionMeta: any
  ) => {
    if (newValues) {
      if (newValues.length >= 4) return
      const newTags = newValues.map(option => option.value)
      setSelectedDietTags(newTags)
      const dietTagsString = newTags.join(',')
      console.log(dietTagsString)
      urlParams.set('dietTags', dietTagsString)
      navigate(`/recipes?${urlParams}`)
    } else {
      setSelectedDietTags([])
    }
  }
  return (
    <div className='filters'>
      <Select
        options={selectSortOptions}
        isSearchable={false}
        isClearable={false}
        className='sort-select'
        onChange={handleSortSelectChange}
        defaultValue={defaultSelectValue}
      />
      <Select
        options={dietLabelsOptions}
        isMulti={true}
        defaultValue={defaultDietTagValue}
        className='diet-label-select'
        placeholder={'Diet Tags'}
        styles={customDietLabelStyles}
        onChange={handleDietTagsChange}
        isSearchable={selectedDietTags.length < 3}
        closeMenuOnSelect={false}
        inputValue={dietSearchVal}
        onInputChange={text => {
          if (text.length <= 16) {
            setDietSearchVal(text)
          }
        }}
      />
    </div>
  )
}

export default RecipeFilters
