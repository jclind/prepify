import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Signup from 'src/pages/Signup/Signup'

// Stub auth so the page renders signed-out chrome without booting Firebase.
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

// UsernameInput imports AuthAPI (→ axios/Firebase) at module scope; mock it so
// the import graph stays out of these presentational tests. (The availability
// check only fires for usernames ≥ 3 chars, which this test never types.)
vi.mock('src/api/auth', () => ({
  default: { checkUsernameAvailability: vi.fn() },
}))

const renderSignup = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    </HelmetProvider>
  )

describe('Signup terms-of-service consent', () => {
  it('shows a consent notice linking to the Terms and Privacy pages', () => {
    renderSignup()
    expect(
      screen.getByText(/by creating an account, you agree to our/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Terms of Service' })
    ).toHaveAttribute('href', '/terms')
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy')
  })
})
