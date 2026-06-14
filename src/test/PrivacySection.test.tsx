import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import PrivacySection from 'src/pages/Settings/sections/PrivacySection'
import AuthAPI from 'src/api/auth'

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue('u1'),
    getProfile: vi.fn().mockResolvedValue({
      bio: '',
      location: '',
      isPublic: true,
      hideLocation: false,
    }),
    updatePrivacy: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockUpdatePrivacy = AuthAPI.updatePrivacy as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>

const renderSection = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PrivacySection />
    </QueryClientProvider>
  )

describe('Privacy settings', () => {
  beforeEach(() => {
    mockUpdatePrivacy.mockClear()
    mockToastError.mockClear()
  })

  it('saves the toggled values', async () => {
    renderSection()
    const publicToggle = await screen.findByRole('switch', {
      name: 'Public profile',
    })
    // Seeds from getProfile (isPublic: true).
    await waitFor(() =>
      expect(publicToggle).toHaveAttribute('aria-checked', 'true')
    )

    fireEvent.click(publicToggle) // → private
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() =>
      expect(mockUpdatePrivacy).toHaveBeenCalledWith(false, false)
    )
  })

  it('does not save when nothing changed', async () => {
    renderSection()
    await screen.findByRole('switch', { name: 'Public profile' })
    fireEvent.click(screen.getByText('Save changes'))

    // The save bar is gated on a dirty form, so an unchanged save is a no-op.
    await waitFor(() => expect(mockUpdatePrivacy).not.toHaveBeenCalled())
  })

  it('saves the hide-location toggle independently of the public toggle', async () => {
    renderSection()
    const hideToggle = await screen.findByRole('switch', {
      name: 'Hide location',
    })
    // Seeds from getProfile (hideLocation: false).
    await waitFor(() =>
      expect(hideToggle).toHaveAttribute('aria-checked', 'false')
    )

    fireEvent.click(hideToggle) // → hide location on
    fireEvent.click(screen.getByText('Save changes'))

    // Public stays true, only hideLocation flips.
    await waitFor(() => expect(mockUpdatePrivacy).toHaveBeenCalledWith(true, true))
  })

  it('seeds from stored non-default values', async () => {
    ;(AuthAPI.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      bio: '',
      location: '',
      isPublic: false,
      hideLocation: true,
    })
    renderSection()

    const publicToggle = await screen.findByRole('switch', {
      name: 'Public profile',
    })
    await waitFor(() =>
      expect(publicToggle).toHaveAttribute('aria-checked', 'false')
    )
    expect(
      screen.getByRole('switch', { name: 'Hide location' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('discards edits back to the saved baseline', async () => {
    renderSection()
    const publicToggle = await screen.findByRole('switch', {
      name: 'Public profile',
    })
    await waitFor(() =>
      expect(publicToggle).toHaveAttribute('aria-checked', 'true')
    )

    fireEvent.click(publicToggle) // → private (dirty)
    expect(publicToggle).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByText('Discard'))

    // Reset restores the baseline and never hits the server.
    expect(publicToggle).toHaveAttribute('aria-checked', 'true')
    expect(mockUpdatePrivacy).not.toHaveBeenCalled()
  })

  it('shows an error toast when the save fails', async () => {
    mockUpdatePrivacy.mockRejectedValueOnce(new Error('save failed'))
    renderSection()
    const publicToggle = await screen.findByRole('switch', {
      name: 'Public profile',
    })
    await waitFor(() =>
      expect(publicToggle).toHaveAttribute('aria-checked', 'true')
    )

    fireEvent.click(publicToggle)
    fireEvent.click(screen.getByText('Save changes'))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('save failed')
    )
  })
})
