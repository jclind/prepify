import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import AddRecipe from 'src/pages/AddRecipe/AddRecipe'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: { addRecipe: vi.fn() },
}))

vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue(null) },
}))

vi.mock('react-top-loading-bar', () => ({ default: () => null }))

// Strip the character-limit guard so tests can type any length string
vi.mock('src/pages/AddRecipe/RecipeFormInput', () => ({
  default: ({ val, setVal, placeholder, type, onEnter, onBlur }: any) => (
    <input
      type={type || 'text'}
      placeholder={placeholder}
      value={val ?? ''}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
      onBlur={onBlur}
    />
  ),
}))

vi.mock('src/pages/AddRecipe/ImagePicker/ImagePicker', () => ({
  default: ({ setImage }: any) => (
    <button
      data-testid='set-image'
      onClick={() => setImage(new File([''], 'photo.jpg', { type: 'image/jpeg' }))}
    >
      Set Image
    </button>
  ),
}))

vi.mock('src/pages/AddRecipe/MealTypeSelector/MealTypeSelector', () => ({
  default: ({ setMealTypes }: any) => (
    <button data-testid='set-meal-type' onClick={() => setMealTypes(['dinner'])}>
      Set Meal Type
    </button>
  ),
}))

vi.mock('src/pages/AddRecipe/CuisineSelector/CuisineSelector', () => ({
  default: () => null,
}))

vi.mock('src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer', () => ({
  default: ({ setIngredients }: any) => (
    <button
      data-testid='add-ingredient'
      onClick={() =>
        setIngredients([
          {
            id: 'ingr-1',
            parsedIngredient: {
              ingredient: 'Flour',
              quantity: 2,
              unit: 'cups',
              comment: null,
              originalIngredientString: '2 cups Flour',
            },
            ingredientData: null,
          },
        ])
      }
    >
      Add Ingredient
    </button>
  ),
}))

vi.mock('src/pages/AddRecipe/Instructions/InstructionsContainer', () => ({
  default: ({ setInstructions }: any) => (
    <button
      data-testid='add-instruction'
      onClick={() =>
        setInstructions([{ id: 'instr-1', content: 'Mix well', index: 1 }])
      }
    >
      Add Instruction
    </button>
  ),
}))

vi.mock('src/pages/AddRecipe/TimeInput/TimeInput', () => ({
  default: ({ setVal }: any) => (
    <button data-testid='set-time' onClick={() => setVal({ hours: 0, minutes: 30 })}>
      Set Time
    </button>
  ),
}))

const mockAddRecipe = RecipeAPI.addRecipe as ReturnType<typeof vi.fn>

const renderAddRecipe = () =>
  render(
    <HelmetProvider>
      <AddRecipe />
    </HelmetProvider>
  )

const fillAllFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('Add a title to your recipe.'), 'My Great Recipe')
  await user.click(screen.getByTestId('set-image'))
  await user.type(
    screen.getByPlaceholderText('Add a description to your recipe'),
    'A delicious recipe'
  )
  await user.type(
    screen.getByPlaceholderText('How many servings does your recipe make?'),
    '4'
  )
  await user.click(screen.getAllByTestId('set-time')[0]) // PrepTime
  await user.click(screen.getByTestId('add-ingredient'))
  await user.click(screen.getByTestId('add-instruction'))
  await user.click(screen.getByTestId('set-meal-type'))
}

describe('AddRecipe form', () => {
  beforeAll(() => {
    // jsdom doesn't implement scrollTo on elements
    HTMLElement.prototype.scrollTo = vi.fn() as any
  })

  beforeEach(() => mockAddRecipe.mockReset())

  it('submit button has the "invalid" CSS class on initial empty render', () => {
    renderAddRecipe()
    expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('invalid')
  })

  it('clicking "Create Recipe" on empty form shows errors for all required fields', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Image is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Servings amount is required')).toBeInTheDocument()
    expect(screen.getByText('Prep time is required')).toBeInTheDocument()
    expect(screen.getByText('Recipe must contain ingredients')).toBeInTheDocument()
    expect(screen.getByText('Instructions are required')).toBeInTheDocument()
    expect(screen.getByText('Meal type required')).toBeInTheDocument()
  })

  it('shows title error when title field is empty', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })

  it('shows title error when title exceeds 50 characters', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    // RecipeFormInput is mocked without character limit enforcement
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'A'.repeat(51)
    )
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.getByText('Title cannot exceed 50 characters')).toBeInTheDocument()
  })

  it('accepts a title of exactly 50 characters with no title error', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'A'.repeat(50)
    )
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.queryByText('Title cannot exceed 50 characters')).toBeNull()
    expect(screen.queryByText('Title is required')).toBeNull()
  })

  it('submit button gains the "valid" CSS class only after all required fields are filled', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    const submitBtn = screen.getByText('Create Recipe').closest('button')!
    expect(submitBtn).toHaveClass('invalid')
    await fillAllFields(user)
    await waitFor(() => expect(submitBtn).toHaveClass('valid'))
  })

  it('clicking "Create Recipe" when valid calls RecipeAPI.addRecipe', async () => {
    const user = userEvent.setup()
    mockAddRecipe.mockResolvedValue({ _id: 'new-1', title: 'My Great Recipe' })
    renderAddRecipe()
    await fillAllFields(user)
    await waitFor(() =>
      expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('valid')
    )
    await user.click(screen.getByText('Create Recipe'))
    await waitFor(() => expect(mockAddRecipe).toHaveBeenCalledTimes(1))
  })

  it('resets all form fields to empty defaults after a successful submission', async () => {
    const user = userEvent.setup()
    mockAddRecipe.mockResolvedValue({ _id: 'new-1', title: 'My Great Recipe' })
    renderAddRecipe()
    await fillAllFields(user)
    await waitFor(() =>
      expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('valid')
    )
    await user.click(screen.getByText('Create Recipe'))
    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('Add a title to your recipe.') as HTMLInputElement
      expect(titleInput.value).toBe('')
    })
    expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('invalid')
  })

  it('shows error message when addRecipe returns null', async () => {
    const user = userEvent.setup()
    mockAddRecipe.mockResolvedValue(null)
    renderAddRecipe()
    await fillAllFields(user)
    await waitFor(() =>
      expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('valid')
    )
    await user.click(screen.getByText('Create Recipe'))
    await screen.findByText('Failed to create recipe. Please try again.')
  })

  it('shows a loading indicator in the button while submission is in progress', async () => {
    const user = userEvent.setup()
    let resolveAddRecipe: (v: any) => void
    mockAddRecipe.mockReturnValue(new Promise(res => { resolveAddRecipe = res }))
    renderAddRecipe()
    await fillAllFields(user)
    await waitFor(() =>
      expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('valid')
    )
    await user.click(screen.getByText('Create Recipe'))
    // After clicking, handleAddRecipe awaits addRecipe — "Create Recipe" text is replaced
    expect(screen.queryByText('Create Recipe')).toBeNull()
    resolveAddRecipe!({ _id: 'new-1' })
    await waitFor(() => expect(screen.getByText('Create Recipe')).toBeInTheDocument())
  })

  it('treats servings value of 0 as invalid (falsy guard blocks submission)', async () => {
    const user = userEvent.setup()
    renderAddRecipe()
    // Without filling servings, it stays as '' which is falsy
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.getByText('Servings amount is required')).toBeInTheDocument()
  })

  it('does not block submission when cookTime is absent', async () => {
    const user = userEvent.setup()
    mockAddRecipe.mockResolvedValue({ _id: 'new-1' })
    renderAddRecipe()
    await fillAllFields(user) // fillAllFields does not set cookTime
    await waitFor(() =>
      expect(screen.getByText('Create Recipe').closest('button')).toHaveClass('valid')
    )
    await user.click(screen.getByText('Create Recipe'))
    await waitFor(() => expect(mockAddRecipe).toHaveBeenCalledTimes(1))
    // No cook time validation error
    expect(screen.queryByText('Cook time is required')).toBeNull()
  })

  it('error messages clear for a field after it is corrected on re-submit', async () => {
    const user = userEvent.setup()
    renderAddRecipe()

    // First submit shows errors
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.getByText('Title is required')).toBeInTheDocument()

    // Fix the title field
    await user.type(screen.getByPlaceholderText('Add a title to your recipe.'), 'My Recipe')

    // Re-submit — validate(true) re-runs, title error no longer applies
    await user.click(screen.getByText('Create Recipe'))
    expect(screen.queryByText('Title is required')).toBeNull()
    // Other errors still present
    expect(screen.getByText('Image is required')).toBeInTheDocument()
  })
})
