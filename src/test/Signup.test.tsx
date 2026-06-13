import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Signup from 'src/pages/Signup/Signup'

// Hoisted so the mocked useAuth and the assertions share one spy.
const { signUpMock } = vi.hoisted(() => ({ signUpMock: vi.fn() }))

// Stub auth so the page renders signed-out chrome without booting Firebase.
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signUp: signUpMock,
    signInWithGoogle: vi.fn(),
  }),
}))

const renderSignup = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    </HelmetProvider>
  )

beforeEach(() => {
  signUpMock.mockClear()
})

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

describe('Signup confirm-password validation', () => {
  it('blocks submit and shows an error when the passwords do not match', () => {
    renderSignup()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'abc123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'xyz789' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('calls signUp with email + password when the passwords match', () => {
    renderSignup()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'abc123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(signUpMock).toHaveBeenCalledWith(
      'a@b.com',
      'abc123',
      expect.any(Function),
      expect.any(Function)
    )
  })
})
