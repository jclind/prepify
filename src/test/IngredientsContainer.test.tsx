import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientsContainer from 'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer'

vi.mock('src/api/recipes', () => ({
  default: { getIngredientData: vi.fn() },
}))

vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue(null) },
}))

// DnD wraps render nothing in jsdom — render children directly
vi.mock('src/pages/AddRecipe/Dnd', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  Drag: ({ children }: any) => <div>{children}</div>,
  Drop: ({ children }: any) => <div>{children}</div>,
}))

// Replace IngredientsInput with a button that calls addIngredientToList directly
vi.mock('src/pages/AddRecipe/Ingredients/IngredientsInput', () => ({
  default: ({ addIngredientToList }: any) => (
    <button
      data-testid='add-btn'
      onClick={() =>
        addIngredientToList({
          id: 'sugar-1',
          parsedIngredient: {
            ingredient: 'Sugar',
            quantity: 1,
            unit: 'cup',
            comment: null,
            originalIngredientString: '1 cup Sugar',
          },
          ingredientData: null,
        })
      }
    >
      Add
    </button>
  ),
}))

// Simplify IngredientList to show ingredient name and a Remove button per item
vi.mock('src/pages/AddRecipe/Ingredients/IngredientList/IngredientList', () => ({
  default: ({ ingredients, removeIngredient }: any) => (
    <ul data-testid='ingredient-list'>
      {ingredients.map((ingr: any) => (
        <li key={ingr.id}>
          {ingr.parsedIngredient?.ingredient ?? ingr.label ?? '(ingredient)'}
          <button onClick={() => removeIngredient(ingr.id)}>Remove</button>
        </li>
      ))}
    </ul>
  ),
}))

vi.mock('src/pages/AddRecipe/AddLabel/AddLabel', () => ({ default: () => null }))

const Wrapper = () => {
  const [ingredients, setIngredients] = useState<any[]>([])
  return (
    <>
      <IngredientsContainer ingredients={ingredients} setIngredients={setIngredients} />
      <span data-testid='count'>{ingredients.length}</span>
    </>
  )
}

describe('IngredientsContainer', () => {
  it('adding an ingredient via the input appends it to the displayed list', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    expect(screen.getByTestId('count').textContent).toBe('0')
    await user.click(screen.getByTestId('add-btn'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByText('Sugar')).toBeInTheDocument()
  })

  it('removing an ingredient filters it out by id', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    await user.click(screen.getByTestId('add-btn'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    await user.click(screen.getByText('Remove'))
    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(screen.queryByText('Sugar')).toBeNull()
  })

  it('"Reorder" button toggles reorder mode (shows "Done" while active)', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    expect(screen.getByText('Reorder')).toBeInTheDocument()
    await user.click(screen.getByText('Reorder'))
    expect(screen.getByText('Done')).toBeInTheDocument()
    await user.click(screen.getByText('Done'))
    expect(screen.getByText('Reorder')).toBeInTheDocument()
  })
})
