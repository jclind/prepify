import React, { useState, useEffect, FC } from 'react'
import Select, { MultiValue, SingleValue } from 'react-select'
import { useNavigate, useLocation } from 'react-router-dom'
import './RecipeFilters.scss'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import styles from '../../_exports.scss'

type RecipeFiltersProps = {
  options?: { value: string; label: string }[]
  selectVal: string
  setSelectVal: (val: string) => void
  selectedTags: string[]
  setSelectedTags: (val: string[]) => void
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
  selectVal,
  setSelectVal,
  selectedTags,
  setSelectedTags,
}) => {
  const [tags, setTags] = useState([])
  const [dietLabels, setDietLabels] = useState<MultiValue<OptionType>>([])
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

  useEffect(() => {
    setSelectVal(selectSortOptions[0].value)
    // getTopTags(5).then(tags => {
    //   setTags(tags.data)
    // })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = (
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

  const handleTagClick = (text: string) => {
    if (selectedTags.includes(text)) {
      const idx = selectedTags.indexOf(text)
      return setSelectedTags([
        ...selectedTags.slice(0, idx),
        ...selectedTags.slice(idx + 1, selectedTags.length),
      ])
    }

    return setSelectedTags([...selectedTags, text])
  }

  const handleDietLabelChange = (
    newValues: MultiValue<OptionType> | null,
    actionMeta: any
  ) => {
    if (newValues) {
      if (newValues.length >= 3) return
      setDietLabels(newValues)
    } else {
      setDietLabels([])
    }
  }
  return (
    <div className='filters'>
      <Select
        options={selectSortOptions}
        isSearchable={false}
        isClearable={false}
        className='sort-select'
        onChange={handleSelectChange}
        defaultValue={defaultSelectValue}
      />
      <Select
        options={dietLabelsOptions}
        isMulti={true}
        className='diet-label-select'
        placeholder={'Diet Label'}
        styles={customDietLabelStyles}
        onChange={handleDietLabelChange}
        value={dietLabels}
        closeMenuOnSelect={false}
      />

      {/* <div className='tags'>
        {tags.map(tag => {
          return (
            <div
              className={
                selectedTags.includes(tag.text)
                  ? 'tag-selected tag'
                  : 'tag-not-selected tag'
              }
              key={tag.text}
              onClick={() => handleTagClick(tag.text)}
            >
              {tag.text} <span className='count'>({tag.count})</span>
            </div>
          )
        })}
      </div> */}
    </div>
  )
}

export default RecipeFilters
