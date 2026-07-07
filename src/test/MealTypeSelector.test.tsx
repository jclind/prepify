import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealTypeSelector from 'src/pages/AddRecipe/MealTypeSelector/MealTypeSelector'

// Controllable react-select double (isMulti: `value` is an option array), so the
// test exercises MealTypeSelector's own value<->option mapping rather than the
// real widget.
vi.mock('react-select', () => ({
  default: ({ value, onChange, options, placeholder, 'aria-label': ariaLabel }: any) => (
    <div>
      <span data-testid='placeholder'>{placeholder}</span>
      <span data-testid='aria-label'>{ariaLabel}</span>
      <span data-testid='selected'>
        {(value ?? []).map((o: any) => o.label).join(',')}
      </span>
      {options.map((opt: any) => (
        <button
          key={opt.value}
          data-testid={`opt-${opt.value}`}
          // isMulti: append the chosen option and hand back the full array.
          onClick={() => onChange([...(value ?? []), opt], { action: 'select-option' })}
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

// Stateful host: selections flow back through setMealTypes and re-render value.
const Harness = ({ initial = [] as string[] }) => {
  const [mealTypes, setMealTypes] = useState<string[]>(initial)
  return (
    <>
      <span data-testid='meal-types'>{mealTypes.join(',')}</span>
      <MealTypeSelector mealTypes={mealTypes} setMealTypes={setMealTypes} />
    </>
  )
}

describe('MealTypeSelector', () => {
  it('renders the meal-type placeholder (not a copy-pasted cuisine one)', () => {
    render(<Harness />)
    expect(screen.getByTestId('placeholder')).toHaveTextContent(
      'Select meal type(s)...'
    )
  })

  it('labels the control as Course for screen readers', () => {
    render(<Harness />)
    expect(screen.getByTestId('aria-label')).toHaveTextContent('Course')
  })

  it('pre-fills options for existing stored values (edit mode)', () => {
    render(<Harness initial={['Breakfast', 'Dinner']} />)
    expect(screen.getByTestId('selected')).toHaveTextContent('Breakfast,Dinner')
  })

  it('drops stored values with no matching option', () => {
    render(<Harness initial={['Dinner', 'Brunch']} />)
    // getMealTypesByString filters to known options, so 'Brunch' is ignored.
    expect(screen.getByTestId('selected')).toHaveTextContent('Dinner')
  })

  it('stores option values (not labels) and accumulates multiple selections', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByTestId('opt-Breakfast'))
    await user.click(screen.getByTestId('opt-Lunch'))
    expect(screen.getByTestId('meal-types')).toHaveTextContent('Breakfast,Lunch')
  })

  it('resets to an empty selection when cleared', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['Dinner']} />)
    expect(screen.getByTestId('meal-types')).toHaveTextContent('Dinner')
    // The null-newValue branch of handleChange must yield [], not crash.
    await user.click(screen.getByTestId('clear'))
    expect(screen.getByTestId('meal-types')).toHaveTextContent('')
  })
})
