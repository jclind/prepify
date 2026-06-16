/**
 * AdminRecipeControls: the admin-only recipe action strip. Self-gates on
 * useAuth().isAdmin (renders nothing otherwise) and fires the feature/publish/
 * takedown mutations. APIs + toast are mocked; react-query is real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminRecipeControls from 'src/Components/AdminRecipeControls/AdminRecipeControls'
import { useAuth } from 'src/context/AuthContext'
import AdminAPI from 'src/api/admin'
import ReportAPI from 'src/api/reports'
import { RecipeType } from 'types'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: {
    setRecipeFeatured: vi.fn().mockResolvedValue({ _id: 'r1', featured: true }),
    setRecipePublished: vi.fn().mockResolvedValue({ _id: 'r1', status: 'unpublished' }),
    getRecipeAutomod: vi.fn(),
    approveRecipe: vi.fn().mockResolvedValue({ _id: 'r1', status: 'active' }),
  },
}))
vi.mock('src/api/reports', () => ({
  __esModule: true,
  default: { setRecipeModeration: vi.fn().mockResolvedValue({ _id: 'r1', status: 'hidden' }) },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedUseAuth = useAuth as unknown as Mock
const mockedFeature = AdminAPI.setRecipeFeatured as unknown as Mock
const mockedPublish = AdminAPI.setRecipePublished as unknown as Mock
const mockedModeration = ReportAPI.setRecipeModeration as unknown as Mock
const mockedAutomod = AdminAPI.getRecipeAutomod as unknown as Mock
const mockedApprove = AdminAPI.approveRecipe as unknown as Mock

const recipe = { _id: 'r1', title: 'T', status: 'active', featured: false } as RecipeType

const renderControls = (r: RecipeType = recipe) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AdminRecipeControls recipe={r} />
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('AdminRecipeControls', () => {
  it('renders nothing for a non-admin', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: false })
    const { container } = renderControls()
    expect(container).toBeEmptyDOMElement()
  })

  it('features a recipe for an admin', async () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls()
    fireEvent.click(screen.getByRole('button', { name: /^feature$/i }))
    await waitFor(() => expect(mockedFeature).toHaveBeenCalledWith('r1', true))
  })

  it('unpublishes an active recipe and takes it down', async () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls()
    fireEvent.click(screen.getByRole('button', { name: /unpublish/i }))
    await waitFor(() => expect(mockedPublish).toHaveBeenCalledWith('r1', false))

    fireEvent.click(screen.getByRole('button', { name: /take down/i }))
    await waitFor(() => expect(mockedModeration).toHaveBeenCalledWith('r1', 'hidden'))
  })

  it('shows Publish/Restore labels when the recipe is hidden+unpublished', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls({ ...recipe, status: 'unpublished' } as RecipeType)
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument()
  })

  // `status` is shared by the publish + moderation states, so the conflicting
  // toggle is disabled to stop one silently clobbering the other.
  it('disables Unpublish while the recipe is taken down (hidden)', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls({ ...recipe, status: 'hidden' } as RecipeType)
    expect(screen.getByRole('button', { name: /unpublish/i })).toBeDisabled()
    // Restore is still available so the admin can return to active first.
    expect(screen.getByRole('button', { name: /restore/i })).toBeEnabled()
  })

  it('disables Take down while the recipe is unpublished', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls({ ...recipe, status: 'unpublished' } as RecipeType)
    expect(screen.getByRole('button', { name: /take down/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^publish$/i })).toBeEnabled()
  })

  it('shows the Pending review pill + auto-held note with the classifier reason', async () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    mockedAutomod.mockResolvedValue({
      classifier: {
        severity: 'medium',
        category: 'harassment',
        reason: 'openai:harassment:0.60',
        source: 'openai',
      },
      createdAt: new Date('2026-06-01').toISOString(),
    })
    renderControls({ ...recipe, status: 'pending_review' } as RecipeType)

    expect(screen.getByText('Pending review')).toBeInTheDocument()
    // The note fills in once the classifier query resolves.
    expect(
      await screen.findByText(
        /auto-held for moderation review — harassment · 60% confidence · medium severity/i
      )
    ).toBeInTheDocument()
    expect(mockedAutomod).toHaveBeenCalledWith('r1')
  })

  it('renders a held recipe without a classifier as a plain auto-held note', async () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    mockedAutomod.mockResolvedValue({ classifier: null, createdAt: null })
    renderControls({ ...recipe, status: 'pending_review' } as RecipeType)

    expect(await screen.findByText(/auto-held for moderation review\.$/i)).toBeInTheDocument()
  })

  it('does not query automod or show held UI for an active recipe', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls() // active
    expect(screen.queryByText('Pending review')).not.toBeInTheDocument()
    expect(screen.queryByText(/auto-held/i)).not.toBeInTheDocument()
    expect(mockedAutomod).not.toHaveBeenCalled()
  })

  it('approves (publishes + clears the hold) a pending_review recipe', async () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    mockedAutomod.mockResolvedValue({ classifier: null, createdAt: null })
    renderControls({ ...recipe, status: 'pending_review' } as RecipeType)

    fireEvent.click(screen.getByRole('button', { name: /approve & publish/i }))
    await waitFor(() => expect(mockedApprove).toHaveBeenCalledWith('r1'))
  })

  it('shows no Approve button on a non-held recipe', () => {
    mockedUseAuth.mockReturnValue({ isAdmin: true })
    renderControls() // active
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })
})
