import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import IngredientList from 'src/pages/AddRecipe/Ingredients/IngredientList/IngredientList'
import { reorder } from 'src/util/reorder'

// The real drag *gesture* (pointer events + layout measurement) can't be
// simulated in jsdom, so we mock @hello-pangea/dnd: capture the onDragEnd
// callback the real DndContext wires up, and render each draggable's children
// with stub provided/snapshot. Firing the captured onDragEnd exercises the
// genuine reorder path (DndContext -> reorder() -> setIngredients) end to end.
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ onDragEnd, children }: any) => {
    ;(globalThis as any).__onDragEnd = onDragEnd
    return <div>{children}</div>
  },
  Droppable: ({ children }: any) =>
    children({ droppableProps: {}, innerRef: () => {}, placeholder: null }, {}),
  Draggable: ({ children }: any) =>
    children(
      { draggableProps: {}, dragHandleProps: {}, innerRef: () => {} },
      { isDragging: false }
    ),
}))

vi.mock('src/api/recipes', () => ({ default: { getIngredientData: vi.fn() } }))
vi.mock('src/api/auth', () => ({ default: { getUID: vi.fn().mockReturnValue(null) } }))
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mkIngredient = (id: string, name: string) => ({
  id,
  parsedIngredient: {
    ingredient: name,
    quantity: 1,
    unit: 'cup',
    comment: null,
    originalIngredientString: `1 cup ${name}`,
  },
  ingredientData: null,
})

const rowNames = () =>
  Array.from(document.querySelectorAll('.ingredient-row')).map(
    r => (r.querySelector('.ingredient-item-text span')?.textContent ?? '').trim()
  )

const fireReorder = async (from: number, to: number) => {
  await act(async () => {
    ;(globalThis as any).__onDragEnd({
      source: { index: from, droppableId: 'droppable' },
      destination: { index: to, droppableId: 'droppable' },
    })
  })
}

// A stateful host so a reorder actually re-renders the list, mirroring how
// IngredientsContainer owns the ingredients array.
const Host: React.FC<{
  initial: any[]
  statusById?: Record<string, 'loading' | 'error'>
}> = ({ initial, statusById = {} }) => {
  const [ingredients, setIngredients] = useState(initial)
  return (
    <IngredientList
      ingredients={ingredients}
      setIngredients={setIngredients}
      statusById={statusById}
      setItemStatus={() => {}}
      removeIngredient={() => {}}
      retryIngredient={() => {}}
    />
  )
}

describe('reorder util', () => {
  it('moves an item from one index to another, preserving the rest', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(reorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(reorder(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('IngredientList drag-to-reorder', () => {
  it('reorders the ingredient list when a row is dragged to a new position', async () => {
    render(
      <Host
        initial={[
          mkIngredient('1', 'flour'),
          mkIngredient('2', 'sugar'),
          mkIngredient('3', 'salt'),
        ]}
      />
    )
    expect(rowNames()).toEqual(['flour', 'sugar', 'salt'])

    // Drag the first row (flour) to the end.
    await fireReorder(0, 2)
    expect(rowNames()).toEqual(['sugar', 'salt', 'flour'])
  })

  it("keeps a row's enrichment status (id-keyed) after it is reordered", async () => {
    // 'sugar' (id 2) is errored — it should carry its retry affordance with it
    // when moved, because status is keyed by id, not list index.
    render(
      <Host
        initial={[
          mkIngredient('1', 'flour'),
          mkIngredient('2', 'sugar'),
          mkIngredient('3', 'salt'),
        ]}
        statusById={{ '2': 'error' }}
      />
    )
    // Before: errored row is in the middle.
    const rowsBefore = Array.from(document.querySelectorAll('.ingredient-row'))
    expect(rowsBefore[1].querySelector('[aria-label="Retry ingredient lookup"]')).toBeTruthy()
    expect(rowsBefore[0].querySelector('[aria-label="Retry ingredient lookup"]')).toBeNull()

    // Move the errored 'sugar' (index 1) to the front (index 0).
    await fireReorder(1, 0)
    expect(rowNames()).toEqual(['sugar', 'flour', 'salt'])

    // After: the retry affordance followed 'sugar' to the first row.
    const rowsAfter = Array.from(document.querySelectorAll('.ingredient-row'))
    expect(rowsAfter[0].querySelector('[aria-label="Retry ingredient lookup"]')).toBeTruthy()
    expect(rowsAfter[1].querySelector('[aria-label="Retry ingredient lookup"]')).toBeNull()
    // Exactly one row stays errored.
    expect(screen.getAllByLabelText('Retry ingredient lookup')).toHaveLength(1)
  })
})
