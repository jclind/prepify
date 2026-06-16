import React, { FC, useEffect, useRef, useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'

export type SortDropdownOption = { value: string; label: string }

type Props = {
  // Base BEM class for the surface's styling, e.g. 'recipes-sort' or
  // 'saved-sort'. The trigger/menu read `${className}__trigger` / `__menu`.
  className: string
  options: SortDropdownOption[]
  value: string
  onChange: (value: string) => void
}

/**
 * Pill trigger that opens a styled sort menu, closing on outside click or
 * Escape. Shared by the Recipes and Saved pages — each passes its own base
 * `className` so the existing per-page SCSS applies unchanged.
 */
const SortDropdown: FC<Props> = ({ className, options, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const currentLabel =
    options.find(o => o.value === value)?.label ?? options[0]?.label ?? ''

  return (
    <div className={className} ref={ref}>
      <button
        type='button'
        className={`${className}__trigger ${open ? 'is-open' : ''}`}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        Sort: {currentLabel}
        <BiChevronDown className='chev' />
      </button>
      {open && (
        <ul className={`${className}__menu`} role='listbox'>
          {options.map(o => (
            <li key={o.value}>
              <button
                type='button'
                className={o.value === value ? 'is-active' : ''}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SortDropdown
