import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

const renderSection = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PrivacySection />
    </QueryClientProvider>
  )

describe('Privacy settings', () => {
  beforeEach(() => mockUpdatePrivacy.mockClear())

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
})
