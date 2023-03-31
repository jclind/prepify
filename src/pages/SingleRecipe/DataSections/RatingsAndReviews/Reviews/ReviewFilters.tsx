import React, { useState, useEffect } from 'react'
import Select from 'react-select'

const options: { value: string; label: string }[] = [
  { value: 'new', label: 'Date: Newest' },
  { value: 'old', label: 'Date: Oldest' },
  { value: 'positive', label: 'Most Positive' },
  { value: 'negative', label: 'Most Negative' },
]
const customStyles = {
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

const ReviewFilters = ({
  reviewListSort,
  setReviewListSort,
  isList,
}: ReviewFiltersProps) => {
  const [selectValue, setSelectValue] = useState<{
    value: string
    label: string
  }>(options[0])

  useEffect(() => {
    setReviewListSort(options[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = (e: any) => {
    setSelectValue(e)
    setReviewListSort(e.value)
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
