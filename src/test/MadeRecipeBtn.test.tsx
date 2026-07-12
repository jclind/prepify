/**
 * MadeRecipeBtn — the "Made It" marker on the single-recipe page.
 *
 * The server models "made" as binary set membership: `GET /checkMadeRecipe`
 * returns `{ made: boolean }` and `POST /madeRecipe` is idempotent per user
 * (there is no per-user re-make log or date history). These tests pin the
 * component to that contract: it reflects `made`, marks-once, and disables
 * afterwards — no client-side "once an hour" throttle or "Made N times" count.
 *
 * RecipeAPI + AuthAPI are mocked; react-query is real (a fresh client per test).
 */

import React, { FC, ReactNode } from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MadeRecipeBtn from 'src/pages/SingleRecipe/Buttons/MadeRecipeBtn'
import RecipeAPI from 'src/api/recipes'
import toast from 'react-hot-toast'
import { GENERIC_ERROR } from 'src/util/toastMessages'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: {
    checkMadeRecipe: vi.fn(),
    madeRecipe: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

let mockUid: string | null = 'test-uid'
vi.mock('src/api/auth', () => ({
  __esModule: true,
  default: { getUID: () => mockUid },
}))

const mockedCheck = RecipeAPI.checkMadeRecipe as unknown as Mock
const mockedMade = RecipeAPI.madeRecipe as unknown as Mock

const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })

const wrapper = (client: QueryClient): FC<{ children: ReactNode }> => {
  return ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const renderBtn = () => {
  const Wrap = wrapper(newClient())
  return render(
    <Wrap>
      <MadeRecipeBtn recipeId='r1' />
    </Wrap>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUid = 'test-uid'
  mockedCheck.mockResolvedValue({ made: false })
  mockedMade.mockResolvedValue(undefined)
})

it('renders nothing when logged out', () => {
  mockUid = null
  const { container } = renderBtn()
  expect(container).toBeEmptyDOMElement()
  expect(mockedCheck).not.toHaveBeenCalled()
})

it('shows an actionable "Made It" button when the recipe is not yet made', async () => {
  mockedCheck.mockResolvedValue({ made: false })
  renderBtn()
  const btn = await screen.findByRole('button', { name: /made it/i })
  await waitFor(() => expect(btn).not.toBeDisabled())
})

it('reflects the server "made" state: renders a completed, disabled button', async () => {
  mockedCheck.mockResolvedValue({ made: true })
  renderBtn()
  const btn = await screen.findByRole('button', { name: /made it/i })
  await waitFor(() => expect(btn).toBeDisabled())
  expect(btn.className).toContain('is-made')
})

it('marks the recipe made on click, then disables the button', async () => {
  mockedCheck.mockResolvedValue({ made: false })
  renderBtn()
  const btn = await screen.findByRole('button', { name: /made it/i })
  await waitFor(() => expect(btn).not.toBeDisabled())

  fireEvent.click(btn)

  await waitFor(() => expect(mockedMade).toHaveBeenCalledWith('r1'))
  await waitFor(() => expect(btn).toBeDisabled())
  expect(btn.className).toContain('is-made')
})

it('POSTs only once when clicked again while the first call is in-flight', async () => {
  mockedCheck.mockResolvedValue({ made: false })
  // Deferred promise: hold the POST open so the second click lands mid-flight.
  let resolveMade!: () => void
  mockedMade.mockImplementation(
    () => new Promise<void>(resolve => (resolveMade = resolve))
  )
  renderBtn()
  const btn = await screen.findByRole('button', { name: /made it/i })
  await waitFor(() => expect(btn).not.toBeDisabled())

  fireEvent.click(btn)
  fireEvent.click(btn)
  expect(mockedMade).toHaveBeenCalledTimes(1)

  resolveMade()
  await waitFor(() => expect(btn).toBeDisabled())
  expect(mockedMade).toHaveBeenCalledTimes(1)
})

it('surfaces a toast and re-enables the button (still unmade) when the POST fails', async () => {
  mockedCheck.mockResolvedValue({ made: false })
  mockedMade.mockRejectedValue(new Error('server down'))
  renderBtn()
  const btn = await screen.findByRole('button', { name: /made it/i })
  await waitFor(() => expect(btn).not.toBeDisabled())

  fireEvent.click(btn)

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(GENERIC_ERROR))
  // The failed mark doesn't stick: the button is actionable again, not made.
  await waitFor(() => expect(btn).not.toBeDisabled())
  expect(btn.className).not.toContain('is-made')
})
