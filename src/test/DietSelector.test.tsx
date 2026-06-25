import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DietSelector from 'src/pages/AddRecipe/DietSelector/DietSelector'

// Mirror the repo convention (ReviewsContainer.test): rather than drive the real
// react-select widget, swap it for a controllable double that surfaces the exact
// props DietSelector wires up — `value`, `options`, `placeholder`, `onChange` —
// so the test exercises DietSelector's own logic (value<->option mapping) and not
// react-select internals.
vi.mock('react-select', () => ({
  default: ({ value, onChange, options, placeholder }: any) => (
    <div>
      <span data-testid='placeholder'>{placeholder}</span>
      {/* The friendly labels react-select would render for the current value —
          this is what getDietLabelsByValue resolves the stored values to. */}
      <span data-testid='selected'>
        {(value ?? []).map((o: any) => o.label).join(',')}
      </span>
      {options.map((opt: any) => (
        <button
          key={opt.value}
          data-testid={`opt-${opt.value}`}
          // Emulate an isMulti selection: append the chosen option to the current
          // selection and hand the full MultiValue array back, as react-select does.
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

// Stateful host so DietSelector behaves as the controlled component it is on the
// form: selections flow back through setNutritionLabels and re-render value.
const Harness = ({ initial = [] as string[] }) => {
  const [labels, setLabels] = useState<string[]>(initial)
  return (
    <>
      <span data-testid='labels'>{labels.join(',')}</span>
      <DietSelector nutritionLabels={labels} setNutritionLabels={setLabels} />
    </>
  )
}

describe('DietSelector', () => {
  it('renders the diet-tag placeholder', () => {
    render(<Harness />)
    expect(screen.getByTestId('placeholder')).toHaveTextContent(
      'Select diet tag(s)...'
    )
  })

  it('pre-fills the friendly labels for existing stored values (edit mode)', () => {
    render(<Harness initial={['GLUTEN_FREE', 'VEGAN']} />)
    // getDietLabelsByValue maps the raw stored values back to their option objects
    // so an edited recipe shows "Gluten Free" / "Vegan", not the raw enum strings.
    expect(screen.getByTestId('selected')).toHaveTextContent('Gluten Free,Vegan')
  })

  it('ignores stored values with no matching option', () => {
    render(<Harness initial={['VEGAN', 'NOT_A_REAL_LABEL']} />)
    // Unknown values are dropped from the displayed selection rather than crashing.
    expect(screen.getByTestId('selected')).toHaveTextContent('Vegan')
  })

  it('stores the option value (not the label) when a tag is selected', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByTestId('opt-VEGAN'))
    expect(screen.getByTestId('labels')).toHaveTextContent('VEGAN')
  })

  it('accumulates multiple selected tags', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByTestId('opt-VEGAN'))
    await user.click(screen.getByTestId('opt-GLUTEN_FREE'))
    expect(screen.getByTestId('labels')).toHaveTextContent('VEGAN,GLUTEN_FREE')
  })

  it('resets to an empty selection when cleared', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['VEGAN']} />)
    expect(screen.getByTestId('labels')).toHaveTextContent('VEGAN')
    // The null-newValue branch of handleChange must yield [], not crash.
    await user.click(screen.getByTestId('clear'))
    expect(screen.getByTestId('labels')).toHaveTextContent('')
  })
})
