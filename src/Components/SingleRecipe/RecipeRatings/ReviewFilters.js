import React, { useState, useEffect } from 'react'
import Select from 'react-select'

const options = [
  { value: 'new', label: 'Date: Newest' },
  { value: 'old', label: 'Date: Oldest' },
  { value: 'positive', label: 'Most Positive' },
  { value: 'negative', label: 'Most Negative' },
]
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    background: '#eeeeee',
    minHeight: '40px',
    height: '40px',
    width: '200px',
    boxShadow: state.isFocused ? null : null,
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: 'hsl(0, 0%, 0%)',
    fontWeight: '500',
    paddingBottom: '3px',
  }),

  valueContainer: (provided, state) => ({
    ...provided,
    height: '40px',
    padding: '0 6px',
  }),

  input: (provided, state) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: state => ({
    display: 'none',
  }),
  indicatorsContainer: (provided, state) => ({
    ...provided,
    height: '40px',
  }),
}

const ReviewFilters = ({ reviewListSort, setReviewListSort, isList }) => {
  const [selectValue, setSelectValue] = useState(options[0])

  useEffect(() => {
    setReviewListSort(options[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = e => {
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
