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
  updateDisplayNameMock,
  toastSuccessMock,
  navigateMock,
  logoutMock,
} = vi.hoisted(() => ({
  getUsernameMock: vi.fn(),
  checkAvailMock: vi.fn(),
  setUsernameMock: vi.fn(),
  updateProfileApiMock: vi.fn(),
  updateDisplayNameMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  navigateMock: vi.fn(),
  logoutMock: vi.fn(),
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUsername: getUsernameMock,
    checkUsernameAvailability: checkAvailMock,
    setUsername: setUsernameMock,
    updateProfile: updateProfileApiMock,
    updateDisplayName: updateDisplayNameMock,
  },
}))
vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: vi.fn() },
}))
vi.mock('react-router-dom', async orig => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', reload: vi.fn().mockResolvedValue(undefined) },
    authLoading: false,
    logout: logoutMock,
  }),
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
  updateDisplayNameMock.mockResolvedValue(undefined)
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
    expect(updateDisplayNameMock).toHaveBeenCalledWith('John Smith')
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
    expect(updateDisplayNameMock).not.toHaveBeenCalled()
    expect(updateProfileApiMock).not.toHaveBeenCalled()
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'))
  })

  it('keeps Continue disabled when the username is taken', async () => {
    checkAvailMock.mockResolvedValue(false)
    renderOnboarding()
    await screen.findByText('Finish your profile')
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'takenname' },
    })
    await waitFor(() => expect(checkAvailMock).toHaveBeenCalled(), {
      timeout: 2500,
    })
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    expect(setUsernameMock).not.toHaveBeenCalled()
  })

  it('surfaces the server reason inline and re-enables Continue when the save is rejected', async () => {
    // Axios-shaped 422 — e.g. the server's moderation block on the username.
    setUsernameMock.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 422'), {
        isAxiosError: true,
        response: { status: 422, data: { error: 'Username was blocked' } },
      })
    )
    renderOnboarding()
    await screen.findByText('Finish your profile')
    const cont = await pickAvailableUsername()
    fireEvent.click(cont)

    // getApiErrorMessage prefers the server's reason over the generic axios text.
    await screen.findByText('Username was blocked')
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
    expect(navigateMock).not.toHaveBeenCalledWith('/')
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  // Escape hatch: a signed-in user without a username must be able to get out
  // rather than getting stuck on this page (the auth signout is the way out).
  it('logs the user out via the cancel/escape hatch', async () => {
    renderOnboarding()
    await screen.findByText('Finish your profile')
    fireEvent.click(screen.getByRole('button', { name: /cancel and log out/i }))
    expect(logoutMock).toHaveBeenCalledTimes(1)
  })
})
