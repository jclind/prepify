import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Account from 'src/pages/Account/Account'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import GamificationAPI from 'src/api/gamification'
import toast from 'react-hot-toast'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue(null),
    getUsername: vi.fn().mockResolvedValue(null),
    getProfile: vi.fn().mockResolvedValue({ bio: '', location: '' }),
  },
}))

vi.mock('src/api/recipes', () => ({
  default: {
    getAccountCounts: vi
      .fn()
      .mockResolvedValue({ saved: 0, ratings: 0, recipes: 0, drafts: 0 }),
  },
}))

vi.mock('src/api/gamification', () => ({
  default: {
    getGamification: vi.fn().mockResolvedValue(null),
    acknowledgeAchievements: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
})

vi.mock('src/context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({ user: null }),
}))

const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>
const mockGetAccountCounts = RecipeAPI.getAccountCounts as ReturnType<
  typeof vi.fn
>
const mockGetGamification = GamificationAPI.getGamification as ReturnType<
  typeof vi.fn
>
const mockAcknowledge = GamificationAPI.acknowledgeAchievements as ReturnType<
  typeof vi.fn
>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>
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
              <Route
                path='drafts'
                element={<div data-testid='drafts-outlet' />}
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
    mockGetAccountCounts.mockReset()
    mockGetAccountCounts.mockResolvedValue({
      saved: 0,
      ratings: 0,
      recipes: 0,
      drafts: 0,
    })
    mockGetGamification.mockReset()
    mockGetGamification.mockResolvedValue(null)
    mockAcknowledge.mockReset()
    mockAcknowledge.mockResolvedValue(undefined)
    mockToastSuccess.mockReset()
    writeText.mockClear()
    mockUseAuth.mockReturnValue({ user: null })
  })

  it('renders without crashing', () => {
    renderAccount()
  })

  it('redirects /account to /account/saved-recipes', async () => {
    renderAccount('/account')
    // navigate('/account/saved-recipes') fires in useEffect; active class confirms arrival
    await waitFor(() => {
      expect(screen.getByText('Saved').closest('.acct-seg')).toHaveClass('active')
    })
  })

  describe('tab active states', () => {
    it('"Saved" link has active class at /account/saved-recipes', async () => {
      renderAccount('/account/saved-recipes')
      await waitFor(() =>
        expect(screen.getByText('Saved').closest('.acct-seg')).toHaveClass('active')
      )
      expect(screen.getByText('Ratings').closest('.acct-seg')).not.toHaveClass(
        'active'
      )
      expect(
        screen.getByText('Your Recipes').closest('.acct-seg')
      ).not.toHaveClass('active')
    })

    it('"Ratings" link has active class at /account/ratings', async () => {
      renderAccount('/account/ratings')
      await waitFor(() =>
        expect(screen.getByText('Ratings').closest('.acct-seg')).toHaveClass(
          'active'
        )
      )
      expect(screen.getByText('Saved').closest('.acct-seg')).not.toHaveClass(
        'active'
      )
    })

    it('"Your Recipes" link has active class at /account/your-recipes', async () => {
      renderAccount('/account/your-recipes')
      await waitFor(() =>
        expect(screen.getByText('Your Recipes').closest('.acct-seg')).toHaveClass(
          'active'
        )
      )
      expect(screen.getByText('Saved').closest('.acct-seg')).not.toHaveClass(
        'active'
      )
    })
  })

  // The visually-hidden <h2> labels the active tab's panel for screen readers so
  // the card <h3>s inside don't skip a level under the profile <h1>. It and the
  // SegmentedNav highlight both derive from accountTabs, so this also guards
  // against the two drifting apart if a route is renamed.
  describe('screen-reader panel heading', () => {
    it.each([
      ['/account/saved-recipes', 'Saved recipes'],
      ['/account/ratings', 'Your ratings'],
      ['/account/your-recipes', 'Recipes you created'],
      ['/account/drafts', 'Your drafts'],
    ])('names the panel at %s as "%s"', async (path, heading) => {
      renderAccount(path)
      expect(
        await screen.findByRole('heading', { level: 2, name: heading })
      ).toBeInTheDocument()
    })
  })

  describe('tab counts', () => {
    it('shows a badge for non-zero counts and hides zero counts', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane', photoURL: null, uid: 'u1' },
      })
      mockGetAccountCounts.mockResolvedValue({
        saved: 5,
        ratings: 0,
        recipes: 2,
        drafts: 0,
      })
      renderAccount()

      // Non-zero counts render their number...
      expect(await screen.findByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      // ...while zero counts render no badge (0 is never shown).
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  describe('achievement unlock toast', () => {
    const gamificationWith = (newlyUnlocked: string[]) => ({
      level: 2,
      rank: 'New Cook',
      xp: 20,
      xpNext: 200,
      pct: 10,
      totalXp: 120,
      achievements: [
        {
          id: 'first_save',
          name: 'First Save',
          description: 'Saved your first recipe.',
          earned: true,
        },
        {
          id: 'first_recipe',
          name: 'First Recipe',
          description: 'Published your first recipe.',
          earned: true,
        },
      ],
      earned: ['first_save', 'first_recipe'],
      newlyUnlocked,
    })

    it('toasts and acknowledges newly-unlocked achievements', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane', photoURL: null, uid: 'u1' },
      })
      mockGetGamification.mockResolvedValue(gamificationWith(['first_save']))
      renderAccount()

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith(
          expect.stringContaining('First Save')
        )
      )
      expect(mockAcknowledge).toHaveBeenCalledWith(['first_save'])
    })

    it('collapses several simultaneous unlocks into one summary toast', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane', photoURL: null, uid: 'u1' },
      })
      mockGetGamification.mockResolvedValue(
        gamificationWith(['first_save', 'first_recipe'])
      )
      renderAccount()

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith(
          expect.stringContaining('2 achievements unlocked')
        )
      )
      // One summary toast, not one per achievement.
      expect(mockToastSuccess).toHaveBeenCalledTimes(1)
      expect(mockAcknowledge).toHaveBeenCalledWith(['first_save', 'first_recipe'])
    })

    it('does not toast when there are no new unlocks', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane', photoURL: null, uid: 'u1' },
      })
      mockGetGamification.mockResolvedValue(gamificationWith([]))
      renderAccount()

      // Level card renders from the gamification data...
      expect(await screen.findByText('Lv 2')).toBeInTheDocument()
      // ...but nothing was newly unlocked, so no toast / acknowledge.
      expect(mockToastSuccess).not.toHaveBeenCalled()
      expect(mockAcknowledge).not.toHaveBeenCalled()
    })
  })

  describe('share link + avatar', () => {
    it('Share copies the /u/<handle> link, not the display name', async () => {
      // displayName differs from the real username handle — the regression that
      // shipped a broken /u/<displayName> link. Share must use the handle.
      mockGetUID.mockReturnValue('u1')
      mockGetUsername.mockResolvedValue('janedoe')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane Doe', photoURL: null, uid: 'u1' },
      })
      renderAccount()

      // The handle resolves asynchronously and isn't shown in the UI, so retry
      // the share click until the resolved handle (not the display name) lands
      // in the copied URL.
      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Share profile'))
        expect(writeText).toHaveBeenLastCalledWith(
          `${window.location.origin}/u/janedoe`
        )
      })
    })

    it('falls back to the initial when the avatar image fails to load', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: {
          displayName: 'Jane',
          photoURL: 'https://example.com/broken.png',
          uid: 'u1',
        },
      })
      renderAccount()

      const img = await screen.findByAltText('Profile avatar')
      fireEvent.error(img)

      await waitFor(() => {
        const fallback = document.querySelector('.acct-avatar.not-set')
        // Image error → the default (food line-icon) avatar takes over.
        expect(fallback).toHaveClass('default-avatar')
        expect(fallback?.querySelector("svg")).toBeTruthy()
      })
    })
  })

  describe('graceful degradation', () => {
    it('renders the page (nav, no LevelCard) when gamification data is unavailable', async () => {
      mockGetUID.mockReturnValue('u1')
      mockGetGamification.mockResolvedValue(null)
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane', photoURL: null, uid: 'u1' },
      })
      renderAccount()

      // The page still renders its nav...
      await screen.findByText('Saved')
      // ...but the LevelCard is omitted rather than crashing on missing data.
      expect(document.querySelector('.acct-levelcard')).toBeNull()
    })
  })

  describe('username / initial display', () => {
    it('shows the default (food line-icon) avatar when auth user has a displayName but no photo', async () => {
      mockGetUID.mockReturnValue('u1')
      mockUseAuth.mockReturnValue({
        user: { displayName: 'Jane Doe', photoURL: null, uid: 'u1' },
      })
      renderAccount()
      await waitFor(() => {
        const profileEl = document.querySelector('.acct-avatar.not-set')
        expect(profileEl).toHaveClass('default-avatar')
        expect(profileEl?.querySelector("svg")).toBeTruthy()
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

    it('shows the default avatar and skips getUsername when not authenticated', async () => {
      mockGetUID.mockReturnValue(null)
      mockUseAuth.mockReturnValue({ user: null })
      renderAccount()
      // No uid → the username query never runs; the default avatar still renders.
      await waitFor(() => {
        const profileEl = document.querySelector('.acct-avatar.not-set')
        expect(profileEl).toHaveClass('default-avatar')
      })
      expect(mockGetUsername).not.toHaveBeenCalled()
    })
  })
})
