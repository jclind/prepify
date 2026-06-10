import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PublicProfile from 'src/pages/PublicProfile/PublicProfile'
import PublicProfileAPI from 'src/api/publicProfile'
import { PublicProfile as PublicProfileType, RecipeType } from 'types'

vi.mock('src/api/publicProfile', () => ({
  default: { getPublicProfile: vi.fn() },
}))

const mockGet = PublicProfileAPI.getPublicProfile as ReturnType<typeof vi.fn>

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
}

describe('PublicProfile', () => {
  beforeEach(() => mockGet.mockReset())

  it('renders identity, bio, earned badges, and recipes', async () => {
    mockGet.mockResolvedValue(sampleProfile)
    renderAt()

    expect(await screen.findByText('Cool Cook')).toBeInTheDocument()
    expect(
      screen.getByText('@CoolUser · PDX · Lv 3 · Home Cook')
    ).toBeInTheDocument()
    expect(screen.getByText('I cook weeknight dinners')).toBeInTheDocument()
    expect(screen.getByText(/First Recipe/)).toBeInTheDocument()
    expect(screen.getByText('Garlic Pasta')).toBeInTheDocument()
  })

  it('falls back to the initial when the avatar image fails to load', async () => {
    mockGet.mockResolvedValue({
      ...sampleProfile,
      photoURL: 'https://example.com/broken.png',
    })
    renderAt()

    const img = await screen.findByAltText('Profile avatar')
    fireEvent.error(img)

    await waitFor(() => {
      const fallback = document.querySelector('.pp-avatar.not-set')
      expect(fallback?.textContent).toBe('C') // "Cool Cook" → C
    })
  })

  it('notes when the recipe grid is capped below the total', async () => {
    mockGet.mockResolvedValue({ ...sampleProfile, recipesTotalCount: 5 })
    renderAt()

    expect(
      await screen.findByText('Showing 1 of 5 recipes')
    ).toBeInTheDocument()
  })

  it('shows a not-found state when the username has no profile', async () => {
    // The API maps a 404 to null (an expected "no such user" outcome).
    mockGet.mockResolvedValue(null)
    renderAt('/u/ghost')

    expect(await screen.findByText('Profile not found')).toBeInTheDocument()
  })
})
