import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import toast from 'react-hot-toast'
import AccountSection from 'src/pages/Settings/sections/AccountSection'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockChangePassword = vi.fn().mockResolvedValue(undefined)
const mockUpdateProfileData = vi.fn().mockResolvedValue(undefined)
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>

const fill = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Account & Security — change password', () => {
  beforeEach(() => {
    mockChangePassword.mockClear()
    mockUpdateProfileData.mockClear()
    mockToastError.mockClear()
    mockUseAuth.mockReturnValue({
      user: {
        email: 'john@example.com',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
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

  it('blocks a change when all fields are empty', () => {
    render(<AccountSection />)
    fireEvent.click(screen.getByText('Update password'))

    expect(screen.getByText('Current password required')).toBeInTheDocument()
    expect(screen.getByText('New password required')).toBeInTheDocument()
    expect(
      screen.getByText('Confirmation password required')
    ).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('blocks reusing the current password as the new one', () => {
    render(<AccountSection />)
    fill('Current password', 'samepass')
    fill('New password', 'samepass')
    fill('Confirm new password', 'samepass')
    fireEvent.click(screen.getByText('Update password'))

    expect(
      screen.getByText('New password must differ from the current one')
    ).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('surfaces a wrong current password inline', async () => {
    mockChangePassword.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'auth/wrong-password' })
    )
    render(<AccountSection />)
    fill('Current password', 'oldpass')
    fill('New password', 'newpass1')
    fill('Confirm new password', 'newpass1')
    fireEvent.click(screen.getByText('Update password'))

    expect(
      await screen.findByText('Incorrect password, try again.')
    ).toBeInTheDocument()
  })
})

describe('Account & Security — email status', () => {
  it('shows a Verified badge for a verified email', () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: 'john@example.com',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
    })
    render(<AccountSection />)
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows an Unverified badge for an unverified email', () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: 'john@example.com',
        emailVerified: false,
        providerData: [{ providerId: 'password' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
    })
    render(<AccountSection />)
    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })
})

describe('Account & Security — email change (password account)', () => {
  beforeEach(() => {
    mockUpdateProfileData.mockClear()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    mockUseAuth.mockReturnValue({
      user: {
        email: 'john@example.com',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('reveals the reauth field + button only after the email is edited', () => {
    render(<AccountSection />)
    expect(screen.queryByText('Update email')).not.toBeInTheDocument()

    fill('Email address', 'new@example.com')
    expect(screen.getByText('Update email')).toBeInTheDocument()
  })

  it('updates the email with the reauth password and confirms via toast', async () => {
    render(<AccountSection />)
    fill('Email address', 'new@example.com')
    // The reauth "Current password" is the first one (the change-password
    // section adds another below it).
    fireEvent.change(screen.getAllByLabelText(/Current password/)[0], {
      target: { value: 'hunter2' },
    })
    fireEvent.click(screen.getByText('Update email'))

    await waitFor(() =>
      expect(mockUpdateProfileData).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hunter2',
      })
    )
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('maps a wrong reauth password to a friendly toast', async () => {
    mockUpdateProfileData.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'auth/wrong-password' })
    )
    render(<AccountSection />)
    fill('Email address', 'new@example.com')
    fireEvent.change(screen.getAllByLabelText(/Current password/)[0], {
      target: { value: 'badpass' },
    })
    fireEvent.click(screen.getByText('Update email'))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Password incorrect, please try again.'
      )
    )
  })

  it('maps an already-in-use email to a friendly toast', async () => {
    mockUpdateProfileData.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'auth/email-already-in-use' })
    )
    render(<AccountSection />)
    fill('Email address', 'taken@example.com')
    fireEvent.change(screen.getAllByLabelText(/Current password/)[0], {
      target: { value: 'hunter2' },
    })
    fireEvent.click(screen.getByText('Update email'))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Email already in use.')
    )
  })
})

describe('Account & Security — federated (Google) account', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        email: 'g@example.com',
        emailVerified: true,
        providerData: [{ providerId: 'google.com' }],
      },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
    })
  })

  it('disables the email field with a "managed by provider" hint', () => {
    render(<AccountSection />)
    expect(screen.getByLabelText(/Email address/)).toBeDisabled()
    expect(
      screen.getByText('Managed by your connected sign-in provider.')
    ).toBeInTheDocument()
  })

  it('hides the change-password section', () => {
    render(<AccountSection />)
    expect(screen.queryByText('Change password')).not.toBeInTheDocument()
    expect(screen.queryByText('Update password')).not.toBeInTheDocument()
  })

  it('lists Google as a connected sign-in method', () => {
    render(<AccountSection />)
    expect(screen.getByText('Google')).toBeInTheDocument()
  })
})

describe('Account & Security — no providers', () => {
  it('shows the empty state when there are no sign-in methods', () => {
    mockUseAuth.mockReturnValue({
      user: { email: '', emailVerified: false, providerData: [] },
      changePassword: mockChangePassword,
      updateProfileData: mockUpdateProfileData,
    })
    render(<AccountSection />)
    expect(screen.getByText('No sign-in methods found.')).toBeInTheDocument()
  })
})
