import React, { useState, useEffect } from 'react'
import RecipeFormInput from '../RecipeFormInput'
import Select from 'react-select'
import './ServingsInput.scss'

const options = [
  { value: 'servings', label: 'Serves:' },
  { value: 'makes', label: 'Makes:' },
]

const ServingsInput = ({ recipeYield, setRecipeYield }) => {
  const [type, setType] = useState(options[0])
  const [value, setValue] = useState('')

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      background: '#eeeeee',
      minHeight: '45px',
      height: '45px',
      width: '135px',
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
      height: '45px',
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
      height: '45px',
    }),
  }

  useEffect(() => {
    if (recipeYield.value) {
      setValue(recipeYield.value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setRecipeYield({ type, value })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, value])

  return (
    <div className='servings-input'>
      <div className='label-title'>Recipe Yields:</div>
      <div className='inputs'>
        <div className='label-title'>
          <Select
            styles={customStyles}
            options={options}
            className='servings-select'
            value={type}
            onChange={e => setType(e)}
          />
        </div>
        <RecipeFormInput
          style={customStyles}
          type={'number'}
          val={value}
          setVal={e => {
            const val = e
            if ((Number(val) >= 1 && Number(val) % 1 === 0) || !val) {
              setValue(val)
            }
          }}
          placeholder={'6'}
          characterLimit={3}
        />
      </div>
    </div>
  )
}

export default ServingsInput
