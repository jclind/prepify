import React, { FC, useState, useEffect } from 'react'
import Select, { MultiValue, SingleValue, StylesConfig } from 'react-select'

type OptionType = { value: string; label: string }

const options: OptionType[] = [
  { value: 'new', label: 'Date: Newest' },
  { value: 'old', label: 'Date: Oldest' },
  { value: 'positive', label: 'Most Positive' },
  { value: 'negative', label: 'Most Negative' },
]
const customStyles: StylesConfig<OptionType> = {
  control: (provided: any, state: any) => ({
    ...provided,
    background: '#eeeeee',
    minHeight: '40px',
    height: '40px',
    width: '200px',
    boxShadow: state.isFocused ? null : null,
  }),
  singleValue: (provided: any, state: any) => ({
    ...provided,
    color: 'hsl(0, 0%, 0%)',
    fontWeight: '500',
    paddingBottom: '3px',
  }),

  valueContainer: (provided: any, state: any) => ({
    ...provided,
    height: '40px',
    padding: '0 6px',
  }),

  input: (provided: any, state: any) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: (state: any) => ({
    display: 'none',
  }),
  indicatorsContainer: (provided: any, state: any) => ({
    ...provided,
    height: '40px',
  }),
}

type ReviewFiltersProps = {
  reviewListSort: string
  setReviewListSort: (val: string) => void
  isList: boolean
}

const ReviewFilters: FC<ReviewFiltersProps> = ({
  reviewListSort,
  setReviewListSort,
  isList,
}) => {
  const [selectValue, setSelectValue] = useState<OptionType>(options[0])

  useEffect(() => {
    setReviewListSort(options[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = (e: MultiValue<OptionType> | SingleValue<OptionType>) => {
    const option = e as SingleValue<OptionType>
    if (!option) return
    setSelectValue(option)
    setReviewListSort(option.value)
  }

  return (
    <div>
      {isList && (
        <div className='review-filters'>
          <Select
            options={options}
            styles={customStyles}
            isSearchable={false}
            isClearable={false}
            className='select'
            onChange={handleSelectChange}
            value={selectValue}
          />
        </div>
      )}
    </div>
  )
}

export default ReviewFilters
