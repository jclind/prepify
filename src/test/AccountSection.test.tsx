import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountSection from 'src/pages/Settings/sections/AccountSection'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockChangePassword = vi.fn().mockResolvedValue(undefined)

const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Account & Security — change password', () => {
  beforeEach(() => {
    mockChangePassword.mockClear()
    mockUseAuth.mockReturnValue({
      user: {
        email: 'john@example.com',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: vi.fn(),
    })
  })

  it('calls changePassword with the current and new password', async () => {
    render(<AccountSection />)
    fill('Current password', 'oldpass')
    fill('New password', 'newpass1')
    fill('Confirm new password', 'newpass1')
    fireEvent.click(screen.getByText('Update password'))

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith('oldpass', 'newpass1')
    )
  })

  it('blocks the change when the new passwords do not match', () => {
    render(<AccountSection />)
    fill('Current password', 'oldpass')
    fill('New password', 'newpass1')
    fill('Confirm new password', 'different')
    fireEvent.click(screen.getByText('Update password'))

    expect(screen.getAllByText('New passwords do not match').length).toBeGreaterThan(0)
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('blocks a too-short new password', () => {
    render(<AccountSection />)
    fill('Current password', 'oldpass')
    fill('New password', 'abc')
    fill('Confirm new password', 'abc')
    fireEvent.click(screen.getByText('Update password'))

    expect(
      screen.getByText('Password must be at least 6 characters')
    ).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('shows connected sign-in methods read-only', () => {
    render(<AccountSection />)
    expect(screen.getByText('Email & password')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})
