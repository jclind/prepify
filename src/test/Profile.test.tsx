import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Profile from 'src/pages/Settings/SubSettings/Profile'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

// The interesting Phase-2 logic in Profile is the save split: account fields
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
const mockUpdateProfileData = vi.fn().mockResolvedValue(undefined)

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderProfile = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Profile />
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
    fireEvent.click(screen.getByText('Save Changes'))

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
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => expect(mockUpdateProfileData).toHaveBeenCalled())
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('writes both stores when account and profile fields both change', async () => {
    renderProfile()
    const nameField = await screen.findByDisplayValue('John')
    const bioField = await screen.findByDisplayValue('old bio')
    fireEvent.change(nameField, { target: { value: 'Jane' } })
    fireEvent.change(bioField, { target: { value: 'new bio' } })
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled())
    expect(mockUpdateProfileData).toHaveBeenCalled()
  })

  it('does not call either store when nothing changed', async () => {
    renderProfile()
    // Wait for the form to seed from the queries before saving.
    await screen.findByDisplayValue('old bio')
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => expect(mockUpdateProfile).not.toHaveBeenCalled())
    expect(mockUpdateProfileData).not.toHaveBeenCalled()
  })
})
