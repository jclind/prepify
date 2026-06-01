import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientsInput from 'src/pages/AddRecipe/Ingredients/IngredientsInput'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: { getIngredientData: vi.fn() },
}))

vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue(null) },
}))

const mockGetIngredientData = RecipeAPI.getIngredientData as ReturnType<typeof vi.fn>

const setup = () => {
  const addIngredientToList = vi.fn()
  const setIngredientLoading = vi.fn()
  render(
    <IngredientsInput
      addIngredientToList={addIngredientToList}
      setIngredientLoading={setIngredientLoading}
      ingredientsLength={0}
      ingredientLoading={{ isLoading: false, index: -1 }}
    />
  )
  return { addIngredientToList, setIngredientLoading }
}

const HINT = 'Enter an ingredient before adding it.'

describe('IngredientsInput — empty-input feedback', () => {
  beforeEach(() => mockGetIngredientData.mockReset())

  it('pressing Enter on an empty field shows a hint and fires no parse request', async () => {
    const user = userEvent.setup()
    const { addIngredientToList } = setup()
    await user.type(
      screen.getByPlaceholderText('Add ingredients to your recipe.'),
      '{enter}'
    )
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(mockGetIngredientData).not.toHaveBeenCalled()
    expect(addIngredientToList).not.toHaveBeenCalled()
  })

  it('treats whitespace-only input as empty', async () => {
    const user = userEvent.setup()
    const { addIngredientToList } = setup()
    await user.type(
      screen.getByPlaceholderText('Add ingredients to your recipe.'),
      '   {enter}'
    )
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(mockGetIngredientData).not.toHaveBeenCalled()
    expect(addIngredientToList).not.toHaveBeenCalled()
  })

  it('trims a valid entry before parsing and adds it to the list', async () => {
    const user = userEvent.setup()
    mockGetIngredientData.mockResolvedValue({
      id: 'x-1',
      parsedIngredient: {
        ingredient: 'flour',
        quantity: 2,
        unit: 'cups',
        comment: null,
        originalIngredientString: '2 cups flour',
      },
      ingredientData: null,
    })
    const { addIngredientToList } = setup()
    await user.type(
      screen.getByPlaceholderText('Add ingredients to your recipe.'),
      '  2 cups flour  {enter}'
    )
    await waitFor(() => expect(addIngredientToList).toHaveBeenCalledTimes(1))
    expect(mockGetIngredientData).toHaveBeenCalledWith('2 cups flour')
    expect(screen.queryByText(HINT)).toBeNull()
  })
})
