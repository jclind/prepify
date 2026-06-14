import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CreateUsername from 'src/pages/CreateUsername/CreateUsername'

const {
  getUsernameMock,
  checkAvailMock,
  setUsernameMock,
  updateProfileApiMock,
  updateProfileFbMock,
  toastSuccessMock,
  navigateMock,
} = vi.hoisted(() => ({
  getUsernameMock: vi.fn(),
  checkAvailMock: vi.fn(),
  setUsernameMock: vi.fn(),
  updateProfileApiMock: vi.fn(),
  updateProfileFbMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUsername: getUsernameMock,
    checkUsernameAvailability: checkAvailMock,
    setUsername: setUsernameMock,
    updateProfile: updateProfileApiMock,
  },
}))
vi.mock('firebase/auth', () => ({ updateProfile: updateProfileFbMock }))
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
}))
vi.mock('react-router-dom', async orig => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, authLoading: false, logout: vi.fn() }),
}))

const renderOnboarding = () =>
  render(
    <MemoryRouter>
      <CreateUsername />
    </MemoryRouter>
  )

// Type a valid username and wait for the availability check to enable Continue.
const pickAvailableUsername = async (name = 'validuser') => {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: name } })
  const cont = screen.getByRole('button', { name: /continue/i })
  await waitFor(() => expect(cont).toBeEnabled(), { timeout: 2500 })
  return cont
}

beforeEach(() => {
  vi.clearAllMocks()
  getUsernameMock.mockResolvedValue(null) // brand-new user -> show the form
  checkAvailMock.mockResolvedValue(true)
  setUsernameMock.mockResolvedValue(undefined)
  updateProfileApiMock.mockResolvedValue(undefined)
  updateProfileFbMock.mockResolvedValue(undefined)
})

describe('CreateUsername (onboarding)', () => {
  it('disables Continue until a username is available', async () => {
    renderOnboarding()
    await screen.findByText('Finish your profile')
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    await pickAvailableUsername()
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
  })

  it('saves username + the optional details that were filled in', async () => {
    renderOnboarding()
    await screen.findByText('Finish your profile')
    const cont = await pickAvailableUsername()
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'John Smith' },
    })
    fireEvent.change(screen.getByLabelText('Location'), {
      target: { value: 'Toronto' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('Tell others a little about yourself'),
      { target: { value: 'I cook.' } }
    )
    fireEvent.click(cont)

    await waitFor(() =>
      expect(setUsernameMock).toHaveBeenCalledWith('validuser')
    )
    expect(updateProfileFbMock).toHaveBeenCalledWith(
      { uid: 'u1' },
      { displayName: 'John Smith' }
    )
    expect(updateProfileApiMock).toHaveBeenCalledWith({
      bio: 'I cook.',
      location: 'Toronto',
    })
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('skips the optional saves when those fields are left blank', async () => {
    renderOnboarding()
    await screen.findByText('Finish your profile')
    const cont = await pickAvailableUsername()
    fireEvent.click(cont)

    await waitFor(() =>
      expect(setUsernameMock).toHaveBeenCalledWith('validuser')
    )
    expect(updateProfileFbMock).not.toHaveBeenCalled()
    expect(updateProfileApiMock).not.toHaveBeenCalled()
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })
})
