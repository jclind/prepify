import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import ForgotPassword from 'src/pages/ForgotPassword/ForgotPassword'

const { forgotPasswordMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
}))

vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ forgotPassword: forgotPasswordMock }),
}))

const renderForgot = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    </HelmetProvider>
  )

beforeEach(() => forgotPasswordMock.mockReset())

describe('ForgotPassword', () => {
  it('calls forgotPassword with the email and the state setters', () => {
    renderForgot()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
    expect(forgotPasswordMock).toHaveBeenCalledWith(
      'a@b.com',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('renders the success message the auth layer reports', () => {
    renderForgot()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    // The page hands its own setSuccess to the auth layer (3rd arg). Drive it
    // the way a successful send would and confirm the banner renders.
    const setSuccess = forgotPasswordMock.mock.calls[0][2]
    act(() => setSuccess('Email sent! Check your inbox for instructions.'))
    expect(
      screen.getByText('Email sent! Check your inbox for instructions.')
    ).toBeInTheDocument()
  })
})
