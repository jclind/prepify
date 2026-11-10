/**
 * SaveControl — the bookmark control on cards and the recipe page. A first tap
 * saves, then shows a "Saved · Add to a collection" toast. The toast must wait
 * for the save to land: a failed save rolls the bookmark back, and a "Saved"
 * toast would tell the user the opposite of what happened.
 *
 * RecipeAPI + AuthAPI are mocked; react-query is real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import SaveControl from 'src/Components/AddToCollection/SaveControl'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: {
    getSavedRecipeIds: vi.fn(),
    saveRecipe: vi.fn(),
    unsaveRecipe: vi.fn(),
  },
}))
vi.mock('src/api/collections', () => ({
  __esModule: true,
  default: { list: vi.fn().mockResolvedValue([]) },
}))
vi.mock('src/api/auth', () => ({
  __esModule: true,
  default: { getUID: () => 'test-uid' },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }),
}))

const mockedSavedIds = RecipeAPI.getSavedRecipeIds as unknown as Mock
const mockedSave = RecipeAPI.saveRecipe as unknown as Mock
const mockedToast = toast as unknown as Mock
const mockedToastError = toast.error as unknown as Mock

const renderControl = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SaveControl recipeId='r1' title='Tacos' />
    </QueryClientProvider>
  )

beforeEach(() => {
  vi.clearAllMocks()
  mockedSavedIds.mockResolvedValue([])
})

it('shows the "Saved" toast only after the save succeeds', async () => {
  let finishSave: () => void = () => {}
  mockedSave.mockReturnValue(new Promise<void>(res => (finishSave = res)))
  const user = userEvent.setup()
  renderControl()

  await user.click(await screen.findByRole('button', { name: 'Save Tacos' }))
  await waitFor(() => expect(mockedSave).toHaveBeenCalledWith('r1'))
  expect(mockedToast).not.toHaveBeenCalled()

  finishSave()
  await waitFor(() => expect(mockedToast).toHaveBeenCalledTimes(1))
  expect(mockedToastError).not.toHaveBeenCalled()
})

it('shows an error and no "Saved" toast when the save fails', async () => {
  mockedSave.mockRejectedValue(new Error('network'))
  const user = userEvent.setup()
  renderControl()

  await user.click(await screen.findByRole('button', { name: 'Save Tacos' }))

  await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1))
  expect(mockedToast).not.toHaveBeenCalled()
})
