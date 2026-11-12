import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import PublicProfile from 'src/pages/PublicProfile/PublicProfile'
import PublicProfileAPI from 'src/api/publicProfile'
import { PublicProfile as PublicProfileType, RecipeType } from 'types'

vi.mock('src/api/publicProfile', () => ({
  default: { getPublicProfile: vi.fn(), getPublicProfileRecipes: vi.fn() },
}))

const mockGet = PublicProfileAPI.getPublicProfile as ReturnType<typeof vi.fn>
const mockGetRecipes =
  PublicProfileAPI.getPublicProfileRecipes as ReturnType<typeof vi.fn>

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderAt = (path = '/u/cooluser') =>
  render(
    <QueryClientProvider client={createClient()}>
      <MemoryRouter initialEntries={[path]}>
        <HelmetProvider>
          <Routes>
            <Route path='/u/:username' element={<PublicProfile />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

const sampleRecipe = {
  _id: 'r1',
  title: 'Garlic Pasta',
  recipeImage: 'https://example.com/p.png',
  servingPrice: 250,
  servings: 4,
  totalTime: 30,
  rating: { rateCount: 0, rateValue: 0 },
} as unknown as RecipeType

const sampleProfile: PublicProfileType = {
  username: 'CoolUser',
  displayName: 'Cool Cook',
  photoURL: null,
  bio: 'I cook weeknight dinners',
  location: 'PDX',
  level: 3,
  rank: 'Home Cook',
  xp: 20,
  xpNext: 200,
  pct: 10,
  achievements: [
    {
      id: 'first_recipe',
      name: 'First Recipe',
      description: 'Published your first recipe.',
      earned: true,
    },
  ],
  recipes: [sampleRecipe],
  recipesTotalCount: 1,
  recipesSavesTotal: 42,
  recipesMadeTotal: 7,
}

describe('PublicProfile', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGetRecipes.mockReset()
  })

  it('renders identity, bio, earned badges, and recipes', async () => {
    mockGet.mockResolvedValue(sampleProfile)
    renderAt()

    expect(await screen.findByText('Cool Cook')).toBeInTheDocument()
    // Identity is split across the header: @handle, a "location · Lv N" line,
    // and the bio. Rank is now a title attr on the level pill, not body text.
    expect(screen.getByText('@CoolUser')).toBeInTheDocument()
    expect(screen.getByText('Lv 3')).toBeInTheDocument()
    expect(document.querySelector('.pp-loc')?.textContent).toContain('PDX')
    expect(screen.getByText('I cook weeknight dinners')).toBeInTheDocument()
    expect(screen.getByText(/First Recipe/)).toBeInTheDocument()
    expect(screen.getByText('Garlic Pasta')).toBeInTheDocument()
  })

  it('falls back to the default avatar when the avatar image fails to load', async () => {
    mockGet.mockResolvedValue({
      ...sampleProfile,
      photoURL: 'https://example.com/broken.png',
    })
    renderAt()

    const img = await screen.findByAltText('Profile avatar')
    fireEvent.error(img)

    await waitFor(() => {
      const fallback = document.querySelector('.pp-avatar.not-set')
      // Image error → the default (food line-icon) avatar takes over.
      expect(fallback).toHaveClass('default-avatar')
      expect(fallback?.querySelector("svg")).toBeTruthy()
    })
  })

  it('offers "load more" with a running count when more recipes exist', async () => {
    mockGet.mockResolvedValue({ ...sampleProfile, recipesTotalCount: 5 })
    renderAt()

    expect(
      await screen.findByRole('button', { name: /load more recipes/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 5')).toBeInTheDocument()
  })

  it('appends the next page when "load more" is clicked', async () => {
    mockGet.mockResolvedValue({ ...sampleProfile, recipesTotalCount: 2 })
    mockGetRecipes.mockResolvedValue({
      recipes: [{ ...sampleRecipe, _id: 'r2', title: 'Tomato Soup' }],
      totalCount: 2,
    })
    renderAt()

    fireEvent.click(
      await screen.findByRole('button', { name: /load more recipes/i })
    )

    // The appended recipe shows up…
    expect(await screen.findByText('Tomato Soup')).toBeInTheDocument()
    expect(screen.getByText('Garlic Pasta')).toBeInTheDocument()
    // …it requested page 1, and the button is gone now that all 2 are shown.
    expect(mockGetRecipes).toHaveBeenCalledWith('cooluser', 1, 12)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /load more recipes/i })
      ).not.toBeInTheDocument()
    )
  })

  it('shows a not-found state when the username has no profile', async () => {
    // The API maps a 404 to null (an expected "no such user" outcome).
    mockGet.mockResolvedValue(null)
    renderAt('/u/ghost')

    expect(await screen.findByText('Profile not found')).toBeInTheDocument()
  })

  it('shows a retryable error, not "Profile not found", when the request fails', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue(sampleProfile)
    renderAt()

    expect(await screen.findByText('Couldn’t load this profile')).toBeInTheDocument()
    expect(screen.queryByText('Profile not found')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Cool Cook')).toBeInTheDocument()
  })

  describe('load more', () => {
    const page1 = {
      recipes: [{ ...sampleRecipe, _id: 'r2', title: 'Tomato Soup' }],
      totalCount: 3,
    }
    afterEach(() => onlineManager.setOnline(true))

    it('retries a failed page instead of skipping past it', async () => {
      mockGet.mockResolvedValue({ ...sampleProfile, recipesTotalCount: 3 })
      mockGetRecipes
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue(page1)
      renderAt()

      fireEvent.click(
        await screen.findByRole('button', { name: /load more recipes/i })
      )
      fireEvent.click(
        await screen.findByRole('button', { name: /couldn’t load more/i })
      )

      expect(await screen.findByText('Tomato Soup')).toBeInTheDocument()
      expect(mockGetRecipes).toHaveBeenCalledTimes(2)
      expect(mockGetRecipes).not.toHaveBeenCalledWith('cooluser', 2, 12)
    })

    it('says when the next page is waiting offline, then loads it on reconnect', async () => {
      mockGet.mockResolvedValue({ ...sampleProfile, recipesTotalCount: 3 })
      mockGetRecipes.mockResolvedValue(page1)
      renderAt()
      const button = await screen.findByRole('button', {
        name: /load more recipes/i,
      })

      act(() => onlineManager.setOnline(false))
      fireEvent.click(button)

      expect(
        await screen.findByRole('button', { name: /you’re offline/i })
      ).toBeDisabled()
      expect(mockGetRecipes).not.toHaveBeenCalled()

      act(() => onlineManager.setOnline(true))
      expect(await screen.findByText('Tomato Soup')).toBeInTheDocument()
    })
  })

  it('a first load offline waits instead of saying "Profile not found"', async () => {
    onlineManager.setOnline(false)
    mockGet.mockResolvedValue(sampleProfile)
    renderAt()

    // react-query notifies on a timer; give the paused state time to render.
    await act(() => new Promise(resolve => setTimeout(resolve, 20)))
    expect(screen.queryByText('Profile not found')).not.toBeInTheDocument()
    expect(mockGet).not.toHaveBeenCalled()

    act(() => onlineManager.setOnline(true))
    expect(await screen.findByText('Cool Cook')).toBeInTheDocument()
  })
})
