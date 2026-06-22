import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddRecipeSummaryBar from 'src/pages/AddRecipe/AddRecipeSummaryBar'
import { calculateServingPrice } from 'src/util/calculateServingPrice'

// The per-serving price is exercised by calculateServingPrice's own tests; here
// we mock it so the bar's formatting/rollup logic is isolated.
vi.mock('src/util/calculateServingPrice', () => ({
  calculateServingPrice: vi.fn(() => 0),
}))
const mockPrice = calculateServingPrice as ReturnType<typeof vi.fn>

const parsed = (id: string) => ({
  id,
  parsedIngredient: {
    ingredient: 'flour',
    quantity: 1,
    unit: 'cup',
    comment: null,
    originalIngredientString: '1 cup flour',
  },
  ingredientData: null,
})
const label = (id: string) => ({ id, label: 'Section' })

const baseProps = {
  servings: 4 as number | '',
  prepTime: { hours: 1, minutes: 30 },
  cookTime: { hours: 0, minutes: 15 },
  ingredients: [parsed('1'), parsed('2')],
  isValid: true,
  loading: false,
  onSubmit: vi.fn(),
}

const renderBar = (overrides = {}) =>
  render(<AddRecipeSummaryBar {...baseProps} {...overrides} />)

beforeEach(() => mockPrice.mockReset().mockReturnValue(0))

describe('AddRecipeSummaryBar', () => {
  it('shows the live rollup: servings, total time, ingredient count', () => {
    renderBar()
    expect(screen.getByText('4')).toBeInTheDocument() // serves
    expect(screen.getByText('1h 45m')).toBeInTheDocument() // 90 + 15 min
    expect(screen.getByText('2')).toBeInTheDocument() // ingredient count
  })

  it('counts only parsed ingredients, not group labels', () => {
    renderBar({ ingredients: [parsed('1'), label('2'), parsed('3'), label('4')] })
    // Two parsed of the four rows.
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders em dashes when servings/time/ingredients/price are empty', () => {
    renderBar({
      servings: '',
      prepTime: null,
      cookTime: null,
      ingredients: [],
    })
    // serves, total time, ingredients, est/serving all collapse to "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
  })

  it('formats total time as minutes-only when under an hour', () => {
    renderBar({ prepTime: { hours: 0, minutes: 25 }, cookTime: null })
    expect(screen.getByText('25 min')).toBeInTheDocument()
  })

  it('shows the per-serving price from calculateServingPrice', () => {
    mockPrice.mockReturnValue(250)
    renderBar()
    expect(screen.getByText('$2.50')).toBeInTheDocument()
  })

  it('marks the submit button valid/invalid from isValid', () => {
    const { rerender } = renderBar({ isValid: true })
    expect(screen.getByRole('button', { name: /create recipe/i })).toHaveClass('valid')
    rerender(<AddRecipeSummaryBar {...baseProps} isValid={false} />)
    expect(screen.getByRole('button', { name: /create recipe/i })).toHaveClass('invalid')
  })

  it('disables the submit button and marks it busy while loading', () => {
    const { container } = renderBar({ loading: true })
    const btn = container.querySelector('.submit-btn') as HTMLButtonElement
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('fires onSubmit when the submit button is clicked', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderBar({ onSubmit })
    await user.click(screen.getByRole('button', { name: /create recipe/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('uses a custom submit label (edit mode)', () => {
    renderBar({ submitLabel: 'Save Changes' })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('renders a Cancel button only when onCancel is provided, and calls it', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { rerender } = renderBar() // no onCancel
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull()
    rerender(<AddRecipeSummaryBar {...baseProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
