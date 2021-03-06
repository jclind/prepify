import React, { useState } from 'react'
import Select from 'react-select'
import { useForm } from '@formspree/react'
import './Help.scss'
import { Helmet } from 'react-helmet'

const options = [
  { value: 'bug', label: 'Reporting A Bug' },
  { value: 'feature', label: 'Requesting A Feature' },
  { value: 'question', label: 'Asking A Question' },
  { value: 'other', label: 'Other' },
]
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    background: 'white',
    minHeight: '40px',
    height: '40px',
    minWidth: '100%',
    boxShadow: state.isFocused ? null : null,
    outline: 'none',
    border: state.isFocused ? '1px solid #00adb5' : '1px solid #d6d6d6',
    ':hover': {
      border: '1px solid #00adb5',
    },
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
  placeholder: (provided, state) => ({
    ...provided,
    fontWeight: '500',
    color: '#bebebe',
  }),
}

const Help = () => {
  const [selectOption, setSelectOption] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [error, setError] = useState('')

  const [formState, submitFormspree] = useForm('xknyboeq')

  const handleSelectChange = e => {
    setSelectOption(e)
  }
  const clearForm = () => {
    setSelectOption(null)
    setTitle('')
    setDescription('')
  }
  const handleSubmit = e => {
    e.preventDefault()
    if (!selectOption) return setError('Please Enter Category')

    submitFormspree(e)
    clearForm()
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Help</title>
      </Helmet>
      <div className='help-page page'>
        <div className='form-container'>
          {formState.succeeded ? (
            <div className='form-success'>
              <h1>Form Submitted!</h1>
              <div className='image-container'>
                <img src='/images/form-submitted.svg' alt='letter submitted' />
              </div>
              <button
                className='submit-another-form-btn btn'
                onClick={() => window.location.reload()}
              >
                Submit Another Form
              </button>
            </div>
          ) : (
            <form className='report-form' onSubmit={handleSubmit}>
              <h4 className='title'>Help Form</h4>
              {error && <div className='error'>{error}</div>}
              <div className='select-container'>
                <div className='text'>Category</div>
                <Select
                  options={options}
                  styles={customStyles}
                  isSearchable={false}
                  isClearable={false}
                  className='select'
                  value={selectOption}
                  onChange={handleSelectChange}
                  placeholder={'Select an option...'}
                  name='category'
                />
              </div>
              <label htmlFor='' className='title-input-label'>
                <div className='text'>Title</div>
                <input
                  type='text'
                  name='title'
                  className='title-input'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='Enter a title'
                  required={true}
                />
              </label>
              <label htmlFor='' className='description-input-label'>
                <div className='text'>Description</div>
                <textarea
                  className='description-textarea'
                  value={description}
                  name='description'
                  onChange={e => setDescription(e.target.value)}
                  placeholder='Enter a description'
                  rows='5'
                  required={true}
                ></textarea>
              </label>
              <button type='submit' className='submit-help-btn btn'>
                Submit
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export default Help
