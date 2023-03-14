import React, { useState, useEffect, FC, useRef } from 'react'
import Select, { MultiValue, SingleValue } from 'react-select'
import { useNavigate, useLocation } from 'react-router-dom'
import './RecipeFilters.scss'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import styles from '../../_exports.scss'
import { cuisinesListOptions } from 'src/recipeData/cuisinesList'
import { getWindowWidth } from 'src/util/getWindowWidth'

type RecipeFiltersProps = {
  options?: { value: string; label: string }[]
  selectVal: string
  setSelectVal: (val: string) => void
  selectedDietTags: string[]
  setSelectedDietTags: (val: string[]) => void
  selectedCuisine: string
  setSelectedCuisine: (val: string) => void
  filtersLoading: boolean
  setFiltersLoading: (val: boolean) => void
}
type OptionType = {
  value: string
  label: string
}

const customDietLabelStyles = {
  control: (provided: any) => ({
    ...provided,
    borderRadius: '20px',
    // maxHeight: '30px',
    minWidth: '150px',
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 5,
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

const getOptionFromValue = <T extends string | string[]>(
  val: T,
  options: OptionType[]
): T extends string ? OptionType | null : OptionType[] | null => {
  if (typeof val === 'string') {
    const result = options.find(el => el.value === val)
    if (!result?.value) {
      return null as T extends string ? OptionType | null : OptionType[] | null
    }
    return { value: result.value, label: result.label } as T extends string
      ? OptionType | null
      : OptionType[] | null
  } else if (Array.isArray(val)) {
    const results = val.map(v => {
      const result = options.find(el => el.value === v)
      if (!result?.value) {
        return null
      }
      return { value: result.value, label: result.label }
    })
    return results as T extends string ? OptionType | null : OptionType[] | null
  } else {
    return null as T extends string ? OptionType | null : OptionType[] | null
  }
}

const RecipeFilters: FC<RecipeFiltersProps> = ({
  options,
  selectVal,
  setSelectVal,
  selectedDietTags,
  setSelectedDietTags,
  selectedCuisine,
  setSelectedCuisine,
  filtersLoading,
  setFiltersLoading,
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
  const cuisine = urlParams.get('cuisine')
  const [dietSearchVal, setDietSearchVal] = useState('')

  const [numFilters, setNumFilters] = useState(0)

  const [windowWidth, setWindowWidth] = useState(getWindowWidth())

  useEffect(() => {
    if (!filtersLoading) {
      let filterCount = 0
      if (selectVal !== 'popular') {
        filterCount++
      }
      if (selectedDietTags.length > 0) {
        filterCount += selectedDietTags.length
      }
      if (selectedCuisine) {
        filterCount++
      }
      setNumFilters(filterCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectVal, selectedDietTags, selectedCuisine])

  useEffect(() => {
    setSelectVal(defaultSelectValue.value)
    setSelectedDietTags(dietTagsParamArr)
    setSelectedCuisine(cuisine ?? '')

    setFiltersLoading(false)

    function handleResize() {
      setWindowWidth(getWindowWidth())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
      setSelectVal(value)
      if (value !== 'popular') {
        urlParams.set('order', value)
      } else {
        urlParams.delete('order')
      }
      navigate(`/recipes?${urlParams}`)
    }
  }

  const handleDietTagsChange = (
    newValues: MultiValue<OptionType> | null,
    actionMeta: any
  ) => {
    if (newValues && newValues.length > 0) {
      if (newValues.length >= 4) return
      const newTags = newValues.map(option => option.value)
      setSelectedDietTags(newTags)
      const dietTagsString = newTags.join(',')
      urlParams.set('dietTags', dietTagsString)
    } else {
      urlParams.delete('dietTags')
      setSelectedDietTags([])
    }
    navigate(`/recipes?${urlParams}`)
  }
  const handleCuisineChange = (
    e: SingleValue<{
      value: string
      label: string
    }>
  ) => {
    if (e) {
      const value = e.value
      if (!e.value) {
        setSelectedCuisine('')
        urlParams.delete('cuisine')
      } else {
        setSelectedCuisine(value)
        urlParams.set('cuisine', value)
      }
      navigate(`/recipes?${urlParams}`)
    }
  }

  // const { getCollapseProps, getToggleProps, isExpanded } = useCollapse()

  const collapseSectionRef = useRef<HTMLDivElement>(null)

  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className='filters'>
      {windowWidth > 815 ? (
        <>
          <Select
            options={selectSortOptions}
            isSearchable={false}
            isClearable={false}
            className='sort-select select'
            onChange={handleSortSelectChange}
            defaultValue={defaultSelectValue}
          />

          <Select
            options={dietLabelsOptions}
            isMulti={true}
            defaultValue={defaultDietTagValue}
            className='diet-label-select select'
            placeholder={'Diet Tags'}
            styles={customDietLabelStyles}
            onChange={handleDietTagsChange}
            isSearchable={selectedDietTags.length < 3}
            closeMenuOnSelect={false}
            inputValue={dietSearchVal}
            value={getOptionFromValue(selectedDietTags, dietLabelsOptions)}
            onInputChange={text => {
              if (text.length <= 16) {
                setDietSearchVal(text)
              }
            }}
          />

          <Select
            options={cuisinesListOptions}
            isSearchable={false}
            placeholder='Cuisine'
            value={getOptionFromValue(selectedCuisine, cuisinesListOptions)}
            className='cuisine-select select'
            styles={customDietLabelStyles}
            onChange={handleCuisineChange}
          />
        </>
      ) : (
        <>
          <button
            // {...getToggleProps()}
            className={`filters-btn ${
              isExpanded || numFilters > 0 ? 'expanded' : ''
            }`}
            onClick={() => {
              if (isExpanded && collapseSectionRef?.current?.style) {
                collapseSectionRef.current.style.overflow = 'hidden'
              }
              setIsExpanded(prev => !prev)
            }}
          >
            {`Filters${numFilters ? ' ● ' + numFilters : ''}`}
          </button>
          <section
            className={`${
              isExpanded ? 'section-expanded' : 'section-collapsed'
            }`}
            ref={collapseSectionRef}
            onTransitionEnd={() => {
              // Add hidden attribute when the height transition ends
              if (isExpanded && collapseSectionRef?.current?.style) {
                collapseSectionRef.current.style.overflow = 'visible'
              }
            }}
          >
            <div className='select-container'>
              <h5>Sort:</h5>
              <Select
                options={selectSortOptions}
                isSearchable={false}
                isClearable={false}
                className='sort-select select'
                onChange={handleSortSelectChange}
                defaultValue={defaultSelectValue}
              />
            </div>
            {/* <div className='select-tags-container'> */}
            <div className='select-container'>
              <h5>Select Diet Tags:</h5>
              <Select
                options={dietLabelsOptions}
                isMulti={true}
                defaultValue={defaultDietTagValue}
                className='diet-label-select select'
                placeholder={'Diet Tags'}
                styles={customDietLabelStyles}
                onChange={handleDietTagsChange}
                // isSearchable={selectedDietTags.length < 3}
                isSearchable={false}
                closeMenuOnSelect={false}
                inputValue={dietSearchVal}
                onInputChange={text => {
                  if (text.length <= 16) {
                    setDietSearchVal(text)
                  }
                }}
              />
            </div>
            <div className='select-container'>
              <h5>Select Cuisine:</h5>
              <Select
                options={cuisinesListOptions}
                isSearchable={false}
                placeholder='Cuisine'
                value={getOptionFromValue(selectedCuisine, cuisinesListOptions)}
                className='cuisine-select select'
                styles={customDietLabelStyles}
                onChange={handleCuisineChange}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default RecipeFilters
