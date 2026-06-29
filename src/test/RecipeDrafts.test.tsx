import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import AddRecipe from 'src/pages/AddRecipe/AddRecipe'
import Drafts from 'src/pages/Account/Drafts/Drafts'
import DraftAPI from 'src/api/drafts'
import { RecipeDraftType, RecipeType } from 'types'

const { navigateFn } = vi.hoisted(() => ({ navigateFn: vi.fn() }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return { ...actual, useNavigate: () => navigateFn }
})

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('src/api/recipes', () => ({
  default: { addRecipe: vi.fn() },
  ADD_RECIPE_AUTH_ERROR: 'AUTH_ERROR',
}))

// Signed-in user so DraftAPI methods don't short-circuit on a missing uid.
vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue('test-uid') },
}))

vi.mock('src/api/drafts', () => ({
  default: {
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    listDrafts: vi.fn(),
    getDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
  DRAFT_LIMIT_CODE: 'DRAFT_LIMIT',
}))

vi.mock('react-top-loading-bar', () => ({ default: () => null }))

vi.mock('src/Components/Form/FormInput', () => ({
  default: ({ val, setVal, placeholder }: any) => (
    <input
      placeholder={placeholder}
      value={val ?? ''}
      onChange={e => setVal(e.target.value)}
    />
  ),
}))

vi.mock('src/pages/AddRecipe/ImagePicker/ImagePicker', () => ({
  default: () => null,
}))
vi.mock('src/pages/AddRecipe/MealTypeSelector/MealTypeSelector', () => ({
  default: () => null,
}))
vi.mock('src/pages/AddRecipe/CuisineSelector/CuisineSelector', () => ({
  default: () => null,
}))
vi.mock(
  'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer',
  () => ({ default: () => null })
)
vi.mock('src/pages/AddRecipe/Instructions/InstructionsContainer', () => ({
  default: () => null,
}))
vi.mock('src/pages/AddRecipe/TimeInput/TimeInput', () => ({
  default: () => null,
}))

const mockedDraftAPI = DraftAPI as unknown as {
  createDraft: ReturnType<typeof vi.fn>
  updateDraft: ReturnType<typeof vi.fn>
  listDrafts: ReturnType<typeof vi.fn>
  getDraft: ReturnType<typeof vi.fn>
  deleteDraft: ReturnType<typeof vi.fn>
}

const makeDraft = (overrides: Partial<RecipeDraftType> = {}): RecipeDraftType => ({
  _id: 'draft-1',
  userId: 'test-uid',
  title: 'Resumed Recipe',
  ingredients: [],
  instructions: [],
  createdAt: '1000',
  updatedAt: '2000',
  ...overrides,
})

const renderAt = (ui: React.ReactNode, initialEntry = '/add-recipe') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>
  )
}

beforeAll(() => {
  HTMLElement.prototype.scrollTo = vi.fn() as any
})

beforeEach(() => {
  vi.clearAllMocks()
  mockedDraftAPI.listDrafts.mockResolvedValue([])
  mockedDraftAPI.createDraft.mockResolvedValue(makeDraft())
  mockedDraftAPI.updateDraft.mockResolvedValue(makeDraft())
  mockedDraftAPI.getDraft.mockResolvedValue(makeDraft())
  mockedDraftAPI.deleteDraft.mockResolvedValue(undefined)
})

describe('AddRecipe draft autosave', () => {
  it('does not create a draft for an empty form', async () => {
    renderAt(<AddRecipe />)
    // Give any debounce window time to (not) fire.
    await new Promise(r => setTimeout(r, 1700))
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()
  })

  it('autosaves a new draft once the user enters content', async () => {
    const user = userEvent.setup()
    renderAt(<AddRecipe />)
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'Soup'
    )
    await waitFor(
      () => expect(mockedDraftAPI.createDraft).toHaveBeenCalledTimes(1),
      { timeout: 3000 }
    )
    // Empty numeric fields are sent as explicit null (not omitted) so a later
    // clear is actually persisted rather than dropped from the payload.
    expect(mockedDraftAPI.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Soup',
        servings: null,
        prepTime: null,
        cookTime: null,
      })
    )
    await screen.findByText('Draft saved')
  })

  it('re-hydrates when the draft id changes in-place (banner resume, no remount)', async () => {
    // The resume banner navigates to /add-recipe?draftId=… while AddRecipe is
    // already mounted — the route doesn't change, so only the query updates.
    // A harness that flips the query via useSearchParams reproduces that path.
    mockedDraftAPI.getDraft.mockResolvedValue(
      makeDraft({ _id: 'draft-9', title: 'Resumed In Place' })
    )
    const ResumeHarness: React.FC = () => {
      const [, setSearchParams] = useSearchParams()
      return (
        <>
          <button onClick={() => setSearchParams({ draftId: 'draft-9' })}>
            go
          </button>
          <AddRecipe />
        </>
      )
    }
    const user = userEvent.setup()
    renderAt(<ResumeHarness />)
    expect(mockedDraftAPI.getDraft).not.toHaveBeenCalled()

    await user.click(screen.getByText('go'))
    await waitFor(() =>
      expect(mockedDraftAPI.getDraft).toHaveBeenCalledWith('draft-9')
    )
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Add a title to your recipe.')
      ).toHaveValue('Resumed In Place')
    )
  })

  it('hydrates the form from an existing draft when resuming via ?draftId', async () => {
    mockedDraftAPI.getDraft.mockResolvedValue(
      makeDraft({ _id: 'draft-9', title: 'Leftover Stew' })
    )
    renderAt(<AddRecipe />, '/add-recipe?draftId=draft-9')
    expect(mockedDraftAPI.getDraft).toHaveBeenCalledWith('draft-9')
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Add a title to your recipe.')
      ).toHaveValue('Leftover Stew')
    )
    // Resuming alone must not create a brand-new draft.
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()
    // Drafts don't persist the image, so resuming prompts the user to re-add it.
    expect(
      screen.getByText(/Drafts don't save your image/i)
    ).toBeInTheDocument()
  })

  it('does not show the re-add-image hint on a fresh create form', async () => {
    const user = userEvent.setup()
    renderAt(<AddRecipe />)
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'Brand New'
    )
    // The user never had an image to lose on a fresh draft.
    expect(screen.queryByText(/Drafts don't save your image/i)).toBeNull()
  })

  it('on a transient load error keeps the draftId and does NOT start a duplicate (finding #3)', async () => {
    // A 500 (vs a 404/403) means the draft probably still exists.
    mockedDraftAPI.getDraft.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    })
    const user = userEvent.setup()
    renderAt(<AddRecipe />, '/add-recipe?draftId=draft-7')
    await waitFor(() =>
      expect(mockedDraftAPI.getDraft).toHaveBeenCalledWith('draft-7')
    )
    // Typing must not spawn a new draft (autosave stays disabled) — otherwise
    // the real draft-7 would be orphaned and duplicated.
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'Soup'
    )
    await new Promise(r => setTimeout(r, 1700))
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()
    expect(mockedDraftAPI.updateDraft).not.toHaveBeenCalled()
  })

  it('on a 404 load error clears the draftId and lets a fresh draft start (finding #3)', async () => {
    mockedDraftAPI.getDraft.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    })
    const user = userEvent.setup()
    renderAt(<AddRecipe />, '/add-recipe?draftId=gone')
    await waitFor(() =>
      expect(mockedDraftAPI.getDraft).toHaveBeenCalledWith('gone')
    )
    // The stale id is dropped, so typing starts a brand-new draft.
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'Soup'
    )
    await waitFor(
      () => expect(mockedDraftAPI.createDraft).toHaveBeenCalledTimes(1),
      { timeout: 3000 }
    )
  })

  it('shows an error (not "Draft saved") when the save does not persist (finding #5)', async () => {
    // createDraft resolving null models the no-auth short-circuit: nothing was
    // written, so the indicator must not claim success.
    mockedDraftAPI.createDraft.mockResolvedValue(null)
    const user = userEvent.setup()
    renderAt(<AddRecipe />)
    await user.type(
      screen.getByPlaceholderText('Add a title to your recipe.'),
      'Soup'
    )
    await waitFor(
      () => expect(mockedDraftAPI.createDraft).toHaveBeenCalled(),
      { timeout: 3000 }
    )
    expect(await screen.findByText("Couldn't save draft")).toBeInTheDocument()
    expect(screen.queryByText('Draft saved')).toBeNull()
  })
})

describe('AddRecipe edit mode', () => {
  const recipe: RecipeType = {
    _id: 'recipe-1',
    userId: 'test-uid',
    title: 'Existing Recipe',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    fridgeLife: 3,
    freezerLife: 30,
    description: 'An existing recipe being edited',
    ingredients: [],
    instructions: [],
    recipeImage: 'https://example.com/img.jpg',
    nutritionData: null,
    totalTime: 30,
    authorUsername: 'chef',
    rating: { rateCount: 0, rateValue: 0 },
    createdAt: '1000',
    editedAt: null,
    servingPrice: 100,
    cuisine: 'Italian',
    mealTypes: ['dinner'],
    nutritionLabels: [],
    views: 0,
    numTimesSaved: 0,
    numTimesMade: 0,
  }

  it('never creates a draft, even when unmounting (e.g. cancel)', async () => {
    const { unmount } = renderAt(<AddRecipe initialRecipe={recipe} />)
    // Let any debounce window pass while the editor is open.
    await new Promise(r => setTimeout(r, 1700))
    // Leaving the editor (cancel/navigation) triggers the unmount flush.
    unmount()
    await new Promise(r => setTimeout(r, 50))
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()
    expect(mockedDraftAPI.updateDraft).not.toHaveBeenCalled()
  })
})

describe('Drafts tab', () => {
  it('shows an empty state when there are no drafts', async () => {
    mockedDraftAPI.listDrafts.mockResolvedValue([])
    renderAt(<Drafts />)
    expect(await screen.findByText('No Drafts Yet')).toBeInTheDocument()
  })

  it('lists drafts and deletes one', async () => {
    mockedDraftAPI.listDrafts.mockResolvedValue([
      makeDraft({ _id: 'd1', title: 'Pasta Bake' }),
    ])
    const user = userEvent.setup()
    renderAt(<Drafts />)
    expect(await screen.findByText('Pasta Bake')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Delete draft'))
    await waitFor(() =>
      expect(mockedDraftAPI.deleteDraft).toHaveBeenCalledWith('d1')
    )
  })

  it('falls back to "Untitled draft" when a draft has no title', async () => {
    mockedDraftAPI.listDrafts.mockResolvedValue([
      makeDraft({ _id: 'd2', title: '' }),
    ])
    renderAt(<Drafts />)
    expect(await screen.findByText('Untitled draft')).toBeInTheDocument()
  })
})
