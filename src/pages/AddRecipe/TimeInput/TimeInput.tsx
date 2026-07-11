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
  // Accessibility: flag both time fields as invalid and point them at the
  // section's error message (AddRecipe passes the FormField errorId).
  invalid?: boolean
  describedBy?: string
}

const TimeInput: React.FC<TimeInputProps> = ({
  label,
  val,
  setVal,
  invalid,
  describedBy,
}) => {
  // Held as the raw field strings (FormInput hands back a DOM string). The
  // aggregate effect below coerces to numbers when it builds the { hours,
  // minutes } object the parent stores.
  const [minutes, setMinutes] = useState<string>('')
  const [hours, setHours] = useState<string>('')
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
      setMinutes(val.minutes ? String(val.minutes) : '')
      setHours(val.hours ? String(val.hours) : '')
    }
    if (!val) {
      setMinutes('')
      setHours('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val])

  const onHoursChange = (raw: string) => {
    const num = Number(raw)
    if (
      raw === '' ||
      (!isNaN(num) && num % 1 === 0 && num >= 0 && num <= 99)
    ) {
      hasUserEdited.current = true
      setHours(raw)
    }
  }
  const onMinutesChange = (raw: string) => {
    const num = Number(raw)
    if (
      raw === '' ||
      (!isNaN(num) && num % 1 === 0 && num >= 0 && num <= 59)
    ) {
      hasUserEdited.current = true
      setMinutes(raw)
    }
  }

  useEffect(() => {
    if (minutes || hours) {
      // Coerce the raw field strings to the numeric { hours, minutes } the parent
      // persists — an empty field becomes 0.
      setVal({ hours: Number(hours) || 0, minutes: Number(minutes) || 0 })
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
          setVal={onHoursChange}
          characterLimit={3}
          inputBeginningText='Hours'
          invalid={invalid}
          describedBy={describedBy}
        />
        <FormInput
          size='compact'
          type='number'
          placeholder='0'
          val={minutes}
          setVal={onMinutesChange}
          characterLimit={3}
          inputBeginningText='Minutes'
          invalid={invalid}
          describedBy={describedBy}
        />{' '}
      </div>
    </div>
  )
}

export default TimeInput
