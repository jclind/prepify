import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Login from 'src/pages/Login/Login'

const { signInDefaultMock, signInWithGoogleMock } = vi.hoisted(() => ({
  signInDefaultMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
}))

vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signInDefault: signInDefaultMock,
    signInWithGoogle: signInWithGoogleMock,
  }),
}))

const renderLogin = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </HelmetProvider>
  )

const fillCreds = () => {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'a@b.com' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'pw123456' },
  })
}

beforeEach(() => {
  signInDefaultMock.mockReset()
  signInWithGoogleMock.mockReset()
})

describe('Login', () => {
  it('submits with remember=true by default', () => {
    renderLogin()
    fillCreds()
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(signInDefaultMock).toHaveBeenCalledWith(
      'a@b.com',
      'pw123456',
      true,
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('passes remember=false when the box is unchecked', () => {
    renderLogin()
    fillCreds()
    fireEvent.click(screen.getByRole('checkbox')) // default checked -> off
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(signInDefaultMock).toHaveBeenCalledWith(
      'a@b.com',
      'pw123456',
      false,
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('renders the friendly error the auth layer reports', () => {
    signInDefaultMock.mockImplementation(
      (_e, _p, _r, _setLoading, setError) =>
        setError('Incorrect email or password. Please try again.')
    )
    renderLogin()
    fillCreds()
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(
      screen.getByText('Incorrect email or password. Please try again.')
    ).toBeInTheDocument()
  })

  it('routes the Google button through signInWithGoogle', () => {
    renderLogin()
    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i })
    )
    expect(signInWithGoogleMock).toHaveBeenCalled()
  })
})
