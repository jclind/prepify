import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CuisineSelector from 'src/pages/AddRecipe/CuisineSelector/CuisineSelector'

// Swap the real react-select for a controllable double exposing the props
// CuisineSelector wires up (single-select: `value` is one option or null), so the
// test drives CuisineSelector's own value<->option mapping, not react-select.
vi.mock('react-select', () => ({
  default: ({ value, onChange, options, placeholder }: any) => (
    <div>
      <span data-testid='placeholder'>{placeholder}</span>
      {/* The friendly label react-select would show for the current value. */}
      <span data-testid='selected'>{value ? value.label : ''}</span>
      {options.slice(0, 5).map((opt: any) => (
        <button
          key={opt.value}
          data-testid={`opt-${opt.value}`}
          // Single-select hands back exactly the chosen option.
          onClick={() => onChange(opt, { action: 'select-option' })}
        >
          {opt.label}
        </button>
      ))}
      <button
        data-testid='clear'
        onClick={() => onChange(null, { action: 'clear' })}
      >
        clear
      </button>
    </div>
  ),
}))

// Stateful host: selections flow back through setCuisine and re-render value.
const Harness = ({ initial = '' }: { initial?: string }) => {
  const [cuisine, setCuisine] = useState(initial)
  return (
    <>
      <span data-testid='cuisine'>{cuisine}</span>
      <CuisineSelector cuisine={cuisine} setCuisine={setCuisine} />
    </>
  )
}

describe('CuisineSelector', () => {
  it('renders the cuisine placeholder', () => {
    render(<Harness />)
    expect(screen.getByTestId('placeholder')).toHaveTextContent(
      'Select a cuisine...'
    )
  })

  it('pre-fills the option for an existing stored value (edit mode)', () => {
    render(<Harness initial='American' />)
    expect(screen.getByTestId('selected')).toHaveTextContent('American')
  })

  it('matches a stored value case-insensitively', () => {
    // getCuisineByString lower-cases both sides, so a legacy 'american' still
    // resolves to the 'American' option instead of showing nothing.
    render(<Harness initial='american' />)
    expect(screen.getByTestId('selected')).toHaveTextContent('American')
  })

  it('shows nothing for a stored value with no matching option', () => {
    render(<Harness initial='Klingon' />)
    expect(screen.getByTestId('selected')).toHaveTextContent('')
  })

  it('stores the selected option value', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByTestId('opt-African'))
    expect(screen.getByTestId('cuisine')).toHaveTextContent('African')
  })

  it('resets to an empty string when cleared', async () => {
    const user = userEvent.setup()
    render(<Harness initial='American' />)
    expect(screen.getByTestId('cuisine')).toHaveTextContent('American')
    // The null branch of handleChange must yield '' (not crash / not undefined).
    await user.click(screen.getByTestId('clear'))
    expect(screen.getByTestId('cuisine')).toHaveTextContent('')
  })
})
