import React, { useState, useEffect } from 'react'
import RecipeFormInput from '../RecipeFormInput'
import './TimeInput.scss'

const TimeInput = ({ label, val, setVal }) => {
  const [minutes, setMinutes] = useState(0)
  const [hours, setHours] = useState(0)

  useEffect(() => {
    if (Number(val) !== 0 && !minutes && !hours) {
      setMinutes(Number(val) % 60)
      setHours(Math.floor(Number(val) / 60))
    }
    if (!val) {
      setMinutes(0)
      setHours(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val])

  useEffect(() => {
    if (minutes || hours)
      setVal((Number(minutes) + Number(hours) * 60).toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, hours])

  return (
    <div className='time-input'>
      <div className='label-title'>{label}</div>
      <div className='time-input-inputs'>
        <RecipeFormInput
          type='number'
          placeholder='Hours'
          val={hours || ''}
          setVal={setHours}
          characterLimit={3}
        />
        <RecipeFormInput
          type='number'
          placeholder='Minutes'
          val={minutes || ''}
          setVal={setMinutes}
          characterLimit={3}
        />{' '}
      </div>
    </div>
  )
}

export default TimeInput
