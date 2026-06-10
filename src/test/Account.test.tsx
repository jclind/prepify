import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Account from 'src/pages/Account/Account'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue(null),
    getUsername: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('src/context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}))

const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

// Account uses <Outlet /> — supply stub child routes so the router
// tree is valid. The stubs need no logic; Account is what's under test.
const renderAccount = (initialPath = '/account/saved-recipes') =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <HelmetProvider>
          <Routes>
            <Route path='/account/*' element={<Account />}>
              <Route
                path='saved-recipes'
                element={<div data-testid='saved-outlet' />}
              />
              <Route
                path='ratings'
                element={<div data-testid='ratings-outlet' />}
              />
              <Route
                path='your-recipes'
                element={<div data-testid='your-recipes-outlet' />}
              />
            </Route>
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('Account page', () => {
  beforeEach(() => {
    // Reset clears both behavior AND call history — prevents call counts from
    // previous tests leaking into the "not.toHaveBeenCalled" assertion below.
    mockGetUID.mockReset()
    mockGetUID.mockReturnValue(null)
    mockGetUsername.mockReset()
    mockGetUsername.mockResolvedValue(null)
    mockUseAuth.mockReturnValue({ user: null })
  })

  it('renders without crashing', () => {
    renderAccount()
  })

  it('redirects /account to /account/saved-recipes', async () => {
    renderAccount('/account')
    // navigate('/account/saved-recipes') fires in useEffect; active class confirms arrival
    await waitFor(() => {
      expect(screen.getByText('Saved')).toHaveClass('active')
    })
  })

  describe('tab active states', () => {
    it('"Saved" link has active class at /account/saved-recipes', async () => {
      renderAccount('/account/saved-recipes')
      await waitFor(() =>
        expect(screen.getByText('Saved')).toHaveClass('active')
      )
      expect(screen.getByText('Ratings')).not.toHaveClass('active')
      expect(screen.getByText('Your Recipes')).not.toHaveClass('active')
    })

    it('"Ratings" link has active class at /account/ratings', async () => {
      renderAccount('/account/ratings')
      await waitFor(() =>
        expect(screen.getByText('Ratings')).toHaveClass('active')
      )
      expect(screen.getByText('Saved')).not.toHaveClass('active')
    })

    it('"Your Recipes" link has active class at /account/your-recipes', async () => {
      renderAccount('/account/your-recipes')
      await waitFor(() =>
        expect(screen.getByText('Your Recipes')).toHaveClass('active')
      )
      expect(screen.getByText('Saved')).not.toHaveClass('active')
    })
  })

  describe('username / initial display', () => {
    it('uses first char of displayName as profile initial when auth user has displayName', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane Doe', photoURL: null, uid: 'u1' },
      })
      renderAccount()
      await waitFor(() => {
        const profileEl = document.querySelector('.acct-avatar.not-set')
        expect(profileEl?.textContent).toBe('J')
      })
    })

    it('calls AuthAPI.getUsername when uid is present but user has no displayName', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: null, photoURL: null, uid: 'u1' },
      })
      mockGetUsername.mockResolvedValue('johndoe')
      renderAccount()
      await waitFor(() => expect(mockGetUsername).toHaveBeenCalled())
    })

    it('displays the resolved username in the h1.username element', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: null, photoURL: null, uid: 'u1' },
      })
      mockGetUsername.mockResolvedValue('johndoe')
      renderAccount()
      await screen.findByText('johndoe')
    })

    it('shows empty profile initial and skips getUsername when not authenticated', async () => {
      mockGetUID.mockReturnValue(null)
      mockUseAuth.mockReturnValue({ user: null })
      renderAccount()
      // No uid → the username query never runs; the avatar initial stays empty.
      await waitFor(() => {
        const profileEl = document.querySelector('.acct-avatar.not-set')
        expect(profileEl?.textContent).toBe('')
      })
      expect(mockGetUsername).not.toHaveBeenCalled()
    })
  })
})
