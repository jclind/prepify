/**
 * UserRecipes — the Your Recipes tab. "Load more" must keep the recipes already
 * on screen while the next page loads (#371). Swapping them for three skeleton
 * cards shrank the grid and moved the scroll position, then grew it back.
 *
 * RecipeAPI is mocked; the thumbnail is stubbed so the test sees which recipes
 * are mounted, not the card's markup.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UserRecipes from 'src/pages/Account/UserRecipes/UserRecipes'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: { getCreatedRecipes: vi.fn() },
}))
vi.mock('src/pages/Account/UserRecipes/UserRecipeThumbnail', () => ({
  default: ({ recipe }: any) =>
    recipe ? <div data-testid='recipe'>{recipe.title}</div> : <div data-testid='skeleton' />,
}))

const mockGetCreated = RecipeAPI.getCreatedRecipes as unknown as Mock

const recipe = (n: number) => ({ _id: `r${n}`, title: `Recipe ${n}` })

const renderTab = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <UserRecipes />
    </QueryClientProvider>
  )

beforeEach(() => {
  vi.clearAllMocks()
})

it('keeps the loaded recipes on screen while the next page loads', async () => {
  let releasePage1: () => void = () => {}
  mockGetCreated.mockImplementation((page: number) =>
    page === 0
      ? Promise.resolve({ recipes: [1, 2, 3, 4, 5, 6].map(recipe), totalCount: 8 })
      : new Promise(res =>
          (releasePage1 = () => res({ recipes: [7, 8].map(recipe), totalCount: 8 }))
        )
  )
  const user = userEvent.setup()
  renderTab()
  await screen.findByText('Recipe 6')

  await user.click(screen.getByRole('button', { name: /Load more recipes/ }))
  await waitFor(() => expect(mockGetCreated).toHaveBeenCalledWith(1, 6, 'new'))

  // Page 1 is still pending: all six loaded recipes stay mounted.
  expect(screen.getAllByTestId('recipe')).toHaveLength(6)
  expect(screen.getByRole('button', { name: /Load more recipes/ })).toBeDisabled()

  releasePage1()
  await screen.findByText('Recipe 8')
  expect(screen.getAllByTestId('recipe')).toHaveLength(8)
})

it('offers a retry on the button when the next page fails, keeping the loaded recipes', async () => {
  mockGetCreated.mockImplementation((page: number) =>
    page === 0
      ? Promise.resolve({ recipes: [1, 2, 3, 4, 5, 6].map(recipe), totalCount: 8 })
      : Promise.reject(new Error('network down'))
  )
  const user = userEvent.setup()
  renderTab()
  await screen.findByText('Recipe 6')

  await user.click(screen.getByRole('button', { name: /Load more recipes/ }))

  const retry = await screen.findByRole('button', { name: /Couldn’t load more. Try again/ })
  expect(screen.getAllByTestId('recipe')).toHaveLength(6)

  mockGetCreated.mockResolvedValue({ recipes: [7, 8].map(recipe), totalCount: 8 })
  await user.click(retry)

  await screen.findByText('Recipe 8')
  // The retry fetched page 1 again, never page 2.
  expect(mockGetCreated).not.toHaveBeenCalledWith(2, 6, 'new')
})
