import React, { useState, useEffect, useRef } from 'react'
import FormInput from 'src/Components/Form/FormInput'
import './TimeInput.scss'

interface TimeInputProps {
  label: string
  val: {
    hours: number
    minutes: number
  } | null
  setVal: (
    value: {
      hours: number
      minutes: number
    } | null
  ) => void
}

const TimeInput: React.FC<TimeInputProps> = ({ label, val, setVal }) => {
  const [minutes, setMinutes] = useState<number | ''>('')
  const [hours, setHours] = useState<number | ''>('')
  // True once the user has typed in either field. Distinguishes a genuine
  // clear-both-fields (which must propagate null to the parent) from the initial
  // pre-hydration render — where both fields are also empty, but the parent still
  // holds the value we're about to load in, so clearing then would wipe it.
  const hasUserEdited = useRef(false)

  useEffect(() => {
    // Hydrate from the parent's { hours, minutes } value (edit / draft-resume).
    // `val` is an object, so the old `Number(val)` produced NaN and blanked the
    // fields — read the members directly instead.
    if (val && !minutes && !hours) {
      setMinutes(val.minutes || '')
      setHours(val.hours || '')
    }
    if (!val) {
      setMinutes('')
      setHours('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val])

  const onHoursChange = (inputVal: number | '') => {
    if (
      inputVal === '' ||
      (!isNaN(inputVal) &&
        inputVal % 1 === 0 &&
        inputVal >= 0 &&
        inputVal <= 99)
    ) {
      hasUserEdited.current = true
      setHours(inputVal)
    }
  }
  const onMinutesChange = (inputVal: number | '') => {
    if (
      inputVal === '' ||
      (!isNaN(inputVal) &&
        inputVal % 1 === 0 &&
        inputVal >= 0 &&
        inputVal <= 59)
    ) {
      hasUserEdited.current = true
      setMinutes(inputVal)
    }
  }

  useEffect(() => {
    if (minutes || hours) {
      setVal({ hours: hours || 0, minutes: minutes || 0 })
    } else if (hasUserEdited.current) {
      // Both fields cleared by the user: propagate the cleared state so the
      // parent drops the stale pre-clear time instead of silently keeping it
      // (previously this branch never fired — `if (minutes || hours)` skipped the
      // all-empty case — so clearing a time on edit left the old value in place
      // and the required-field guard still passed against it).
      setVal(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, hours])

  return (
    <div className='time-input'>
      <div className='label-title'>{label}</div>
      <div className='time-input-inputs'>
        <FormInput
          size='compact'
          type='number'
          placeholder='0'
          val={hours}
          setVal={(val: number | '') => onHoursChange(val)}
          characterLimit={3}
          inputBeginningText='Hours'
        />
        <FormInput
          size='compact'
          type='number'
          placeholder='0'
          val={minutes}
          setVal={(val: number | '') => onMinutesChange(val)}
          characterLimit={3}
          inputBeginningText='Minutes'
        />{' '}
      </div>
    </div>
  )
}

export default TimeInput
