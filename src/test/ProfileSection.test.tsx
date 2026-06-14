import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import ProfileSection from 'src/pages/Settings/sections/ProfileSection'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

// The interesting logic in the Profile section is the save split: account fields
// (Firebase + username) and profile fields (bio/location) live in separate
// stores and must be written independently, so editing one never touches the
// other. These tests pin that routing down.

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue('u1'),
    getUsername: vi.fn().mockResolvedValue('johndoe'),
    getProfile: vi
      .fn()
      .mockResolvedValue({ bio: 'old bio', location: 'Portland' }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    checkUsernameAvailability: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockGetProfile = AuthAPI.getProfile as ReturnType<typeof vi.fn>
const mockUpdateProfile = AuthAPI.updateProfile as ReturnType<typeof vi.fn>
const mockCheckAvailability =
  AuthAPI.checkUsernameAvailability as ReturnType<typeof vi.fn>
const mockUpdateProfileData = vi.fn().mockResolvedValue(undefined)
const mockToastError = toast.error as ReturnType<typeof vi.fn>

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderProfile = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProfileSection />
    </QueryClientProvider>
  )

describe('Profile settings — save routing', () => {
  beforeEach(() => {
    mockUpdateProfileData.mockClear()
    mockUpdateProfile.mockClear()
    mockGetProfile.mockResolvedValue({ bio: 'old bio', location: 'Portland' })
    mockUseAuth.mockReturnValue({
      user: {
        displayName: 'John',
        photoURL: '',
        email: 'john@example.com',
        uid: 'u1',
      },
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('a bio-only change calls updateProfile and not updateProfileData', async () => {
    renderProfile()
    const bioField = await screen.findByDisplayValue('old bio')
    fireEvent.change(bioField, { target: { value: 'new bio' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        bio: 'new bio',
        location: 'Portland',
      })
    )
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })

  it('an account-field change calls updateProfileData and not updateProfile', async () => {
    renderProfile()
    const nameField = await screen.findByDisplayValue('John')
    fireEvent.change(nameField, { target: { value: 'Jane' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() => expect(mockUpdateProfileData).toHaveBeenCalled())
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('writes both stores when account and profile fields both change', async () => {
    renderProfile()
    const nameField = await screen.findByDisplayValue('John')
    const bioField = await screen.findByDisplayValue('old bio')
    fireEvent.change(nameField, { target: { value: 'Jane' } })
    fireEvent.change(bioField, { target: { value: 'new bio' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled())
    expect(mockUpdateProfileData).toHaveBeenCalled()
  })

  it('saves a bio-only change even when the display name is empty', async () => {
    // Identity validation should only gate the account write. An account with no
    // Firebase display name must still be able to edit its bio.
    mockUseAuth.mockReturnValue({
      user: { displayName: '', photoURL: '', email: 'john@example.com', uid: 'u1' },
      updateProfileData: mockUpdateProfileData,
    })
    renderProfile()
    const bioField = await screen.findByDisplayValue('old bio')
    fireEvent.change(bioField, { target: { value: 'new bio' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        bio: 'new bio',
        location: 'Portland',
      })
    )
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })

  it('does not call either store when nothing changed', async () => {
    renderProfile()
    // Wait for the form to seed from the queries before saving.
    await screen.findByDisplayValue('old bio')
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() => expect(mockUpdateProfile).not.toHaveBeenCalled())
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })
})

describe('Profile settings — username availability', () => {
  beforeEach(() => {
    mockCheckAvailability.mockReset().mockResolvedValue(true)
    mockUpdateProfileData.mockClear()
    mockToastError.mockClear()
    mockUseAuth.mockReturnValue({
      user: { displayName: 'John', photoURL: '', email: 'j@x.com', uid: 'u1' },
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('flags an invalid username inline without hitting the server', async () => {
    renderProfile()
    await screen.findByDisplayValue('johndoe')
    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'ab' },
    })

    expect(
      await screen.findByText(/Usernames are 3.30 characters/)
    ).toBeInTheDocument()
    expect(mockCheckAvailability).not.toHaveBeenCalled()
  })

  it('reports an available username after the debounce', async () => {
    mockCheckAvailability.mockResolvedValue(true)
    renderProfile()
    await screen.findByDisplayValue('johndoe')
    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'janedoe' },
    })

    expect(
      await screen.findByText('janedoe is available', undefined, {
        timeout: 2000,
      })
    ).toBeInTheDocument()
  })

  it('reports a taken username after the debounce', async () => {
    mockCheckAvailability.mockResolvedValue(false)
    renderProfile()
    await screen.findByDisplayValue('johndoe')
    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'janedoe' },
    })

    expect(
      await screen.findByText('janedoe is already taken', undefined, {
        timeout: 2000,
      })
    ).toBeInTheDocument()
  })

  it('never flags the saved username as taken', async () => {
    renderProfile()
    await screen.findByDisplayValue('johndoe')
    // Re-typing the current username must stay idle (no server check at all).
    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'johndoe' },
    })

    await waitFor(() => expect(mockCheckAvailability).not.toHaveBeenCalled())
    expect(screen.queryByText(/already taken/)).not.toBeInTheDocument()
  })
})

describe('Profile settings — save validation gates', () => {
  beforeEach(() => {
    mockCheckAvailability.mockReset().mockResolvedValue(true)
    mockUpdateProfileData.mockClear()
    mockUpdateProfile.mockClear()
    mockToastError.mockClear()
    mockUseAuth.mockReturnValue({
      user: { displayName: 'John', photoURL: '', email: 'j@x.com', uid: 'u1' },
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('blocks a save while the username is taken', async () => {
    mockCheckAvailability.mockResolvedValue(false)
    renderProfile()
    await screen.findByDisplayValue('johndoe')
    fireEvent.change(screen.getByLabelText(/Username/), {
      target: { value: 'janedoe' },
    })
    await screen.findByText('janedoe is already taken', undefined, {
      timeout: 2000,
    })

    fireEvent.click(screen.getByText('Save changes'))

    expect(mockToastError).toHaveBeenCalledWith('janedoe is already taken')
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })

  it('blocks a save when the display name has been cleared', async () => {
    renderProfile()
    await screen.findByDisplayValue('John')
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByText('Save changes'))

    expect(mockToastError).toHaveBeenCalledWith('Display name is required.')
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })
})

describe('Profile settings — avatar', () => {
  beforeEach(() => {
    mockCheckAvailability.mockReset().mockResolvedValue(true)
    mockUpdateProfileData.mockClear()
    mockToastError.mockClear()
  })

  it('rejects an oversized file with a toast and does not stage it', async () => {
    mockUseAuth.mockReturnValue({
      user: { displayName: 'John', photoURL: '', email: 'j@x.com', uid: 'u1' },
      updateProfileData: mockUpdateProfileData,
    })
    const { container } = renderProfile()
    await screen.findByDisplayValue('old bio')

    const input = container.querySelector(
      '#settings-avatar-input'
    ) as HTMLInputElement
    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 5001 * 1024 })
    fireEvent.change(input, { target: { files: [big] } })

    expect(mockToastError).toHaveBeenCalledWith(
      'File cannot be more than 5mb in size'
    )
  })

  it('removing the avatar makes the form dirty and saves a null avatar', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        displayName: 'John',
        photoURL: 'https://cdn/me.png',
        email: 'j@x.com',
        uid: 'u1',
      },
      updateProfileData: mockUpdateProfileData,
    })
    renderProfile()
    await screen.findByDisplayValue('old bio')

    fireEvent.click(screen.getByText('Remove'))
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() => expect(mockUpdateProfileData).toHaveBeenCalled())
    expect(mockUpdateProfileData.mock.calls[0][0].imgFile).toBeNull()
  })
})

describe('Profile settings — save failures', () => {
  beforeEach(() => {
    mockCheckAvailability.mockReset().mockResolvedValue(true)
    mockUpdateProfileData.mockReset()
    mockUpdateProfile.mockClear()
    mockToastError.mockClear()
    mockUseAuth.mockReturnValue({
      user: { displayName: 'John', photoURL: '', email: 'j@x.com', uid: 'u1' },
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('maps an already-in-use email error to a friendly toast', async () => {
    mockUpdateProfileData.mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    })
    renderProfile()
    const nameField = await screen.findByDisplayValue('John')
    fireEvent.change(nameField, { target: { value: 'Jane' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Email already in use.')
    )
  })

  it('skips the profile write when the account write fails (account-first)', async () => {
    mockUpdateProfileData.mockRejectedValueOnce(new Error('boom'))
    renderProfile()
    const nameField = await screen.findByDisplayValue('John')
    const bioField = await screen.findByDisplayValue('old bio')
    fireEvent.change(nameField, { target: { value: 'Jane' } })
    fireEvent.change(bioField, { target: { value: 'new bio' } })
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() => expect(mockUpdateProfileData).toHaveBeenCalled())
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })
})
