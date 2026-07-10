/**
 * Auth mock strategy
 * ──────────────────
 * vi.mock calls are hoisted above imports by Vitest, so they're in place before
 * any module-level Firebase code executes (e.g. `const auth = getAuth()` in
 * AuthContext.tsx and `initializeApp(...)` in src/client/db.ts).
 *
 * The onAuthStateChanged stub captures its callback (h.authCallback) instead of
 * firing it, so AuthProvider starts in `loading: true` and renders only the
 * loading spinner. Tests can then fire the callback themselves to settle auth
 * and let the real route table render.
 *
 * App.tsx has no Router; it relies on context from react-router-dom (useLocation
 * in ScrollToTop, useNavigate in AuthProvider). The MemoryRouter wrapper below
 * supplies that context; QueryClientProvider mirrors index.tsx for the
 * react-query hooks on the home route.
 */

import React from 'react'
import { vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from 'src/App'

const h = vi.hoisted(() => ({
  authCallback: null as ((user: unknown) => void) | null,
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({
    onAuthStateChanged: (cb: (user: unknown) => void) => {
      h.authCallback = cb
      return () => {}
    },
    currentUser: null,
  }),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  updatePassword: vi.fn(),
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn().mockReturnValue({}),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({}),
}))

// The home route fetches recipe rows on mount; keep it network-free.
vi.mock('src/api/recipes', () => ({
  default: {
    getTrendingRecipes: vi.fn().mockResolvedValue([]),
    getAllRecipes: vi.fn().mockResolvedValue({ recipes: [], totalCount: 0 }),
    getForYouRecipes: vi.fn().mockResolvedValue([]),
    getRandomRecipe: vi.fn().mockResolvedValue(null),
    searchAutoCompleteRecipes: vi.fn().mockResolvedValue([]),
  },
}))

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('App', () => {
  beforeEach(() => {
    h.authCallback = null
    // jsdom has no Element.scrollTo; ScrollToTop calls it on the body.
    document.body.scrollTo = vi.fn()
  })

  it('shows the auth-loading state until onAuthStateChanged settles', () => {
    renderApp()
    expect(
      screen.getByRole('heading', { name: /auth loading/i })
    ).toBeInTheDocument()
    // No route content while auth is unresolved.
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })

  it('renders the home route once auth settles signed-out', async () => {
    renderApp()
    expect(h.authCallback).not.toBeNull()

    await act(async () => {
      h.authCallback!(null)
    })

    // The route table + Layout rendered: page landmarks plus real home content.
    expect(screen.getByRole('main')).toBeInTheDocument()
    // Navbar + mobile menu both expose nav landmarks — at least one rendered.
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: /trending this week/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /auth loading/i })
    ).not.toBeInTheDocument()
  })
})
