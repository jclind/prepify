/**
 * AddToCollectionPopover — the save-to-collections checkbox popover.
 *
 * persist() sends the FULL membership set (setRecipeCollections replaces the
 * server-side collectionIds array wholesale). So if the initial membership load
 * (getSavedRecipe) fails and the popover falls through to an empty baseline with
 * live checkboxes, the first toggle would silently wipe every collection the
 * recipe is actually in. These tests pin that a failed load blocks toggling
 * instead of destroying data.
 *
 * RecipeAPI + CollectionsAPI are mocked; the component owns its own state.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddToCollectionPopover from 'src/Components/AddToCollection/AddToCollectionPopover'
import RecipeAPI from 'src/api/recipes'
import CollectionsAPI from 'src/api/collections'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: { getSavedRecipe: vi.fn() },
}))
vi.mock('src/api/collections', () => ({
  __esModule: true,
  default: { setRecipeCollections: vi.fn(), create: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

const mockGetSaved = RecipeAPI.getSavedRecipe as unknown as Mock
const mockSetCollections = CollectionsAPI.setRecipeCollections as unknown as Mock

const collections = [
  { id: 'A', name: 'Dinners' },
  { id: 'B', name: 'Desserts' },
]

const renderPopover = () =>
  render(
    <AddToCollectionPopover
      recipeId='r1'
      collections={collections as any}
      saved
      onToggleSaved={vi.fn()}
      onMutated={vi.fn()}
    />
  )

beforeEach(() => {
  vi.clearAllMocks()
})

it('starts the recipe’s existing memberships checked and toggles from there', async () => {
  mockGetSaved.mockResolvedValue({ collectionIds: ['A'] })
  mockSetCollections.mockResolvedValue(undefined)
  const user = userEvent.setup()
  renderPopover()

  const dinners = await screen.findByRole('button', { name: /Dinners/ })
  // Toggling adds B to the FULL set (A already present), never replacing it.
  await user.click(await screen.findByRole('button', { name: /Desserts/ }))
  await waitFor(() => expect(mockSetCollections).toHaveBeenCalledTimes(1))
  const [, sentIds] = mockSetCollections.mock.calls[0]
  expect([...sentIds].sort()).toEqual(['A', 'B'])
  expect(dinners).toBeInTheDocument()
})

it('does NOT wipe memberships when the membership load fails', async () => {
  // getSavedRecipe rejects → the popover must surface an error and block toggling
  // rather than render empty checkboxes whose first toggle overwrites the set.
  mockGetSaved.mockRejectedValue(new Error('network'))
  const user = userEvent.setup()
  renderPopover()

  await screen.findByText(/Couldn’t load this recipe’s collections/i)

  // The collection option buttons must not be interactive from a bogus baseline.
  expect(screen.queryByRole('button', { name: /Dinners/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Desserts/ })).not.toBeInTheDocument()

  // Nothing was persisted — no chance to clobber the real membership set.
  await user.click(screen.getByText(/Couldn’t load/i))
  expect(mockSetCollections).not.toHaveBeenCalled()
})
