import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DangerSection from 'src/pages/Settings/sections/DangerSection'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/api/auth', () => ({
  default: { exportMyData: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>
const mockDeleteAccount = vi.fn().mockResolvedValue(undefined)

const modalDeleteButton = () =>
  // After the modal opens there are two "Delete account" buttons — the card
  // trigger and the modal's confirm button. The modal's is the last one.
  screen.getAllByRole('button', { name: /delete account/i }).slice(-1)[0]

describe('Danger Zone — delete account gate', () => {
  beforeEach(() => {
    mockDeleteAccount.mockClear()
    mockUseAuth.mockReturnValue({
      user: { providerData: [{ providerId: 'password' }] },
      deleteAccount: mockDeleteAccount,
    })
  })

  it('keeps delete disabled until the confirmation word and password are entered', () => {
    render(<DangerSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

    expect(modalDeleteButton()).toBeDisabled()

    // Confirmation word alone is not enough for a password account.
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    expect(modalDeleteButton()).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your password'), {
      target: { value: 'hunter2' },
    })
    expect(modalDeleteButton()).toBeEnabled()
  })

  it('does not delete with the wrong confirmation word', () => {
    render(<DangerSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'delete' }, // wrong case
    })
    fireEvent.change(screen.getByLabelText('Your password'), {
      target: { value: 'hunter2' },
    })

    expect(modalDeleteButton()).toBeDisabled()
    fireEvent.click(modalDeleteButton())
    expect(mockDeleteAccount).not.toHaveBeenCalled()
  })

  it('deletes with the password once fully confirmed', async () => {
    render(<DangerSection />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    fireEvent.change(screen.getByLabelText('Your password'), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(modalDeleteButton())

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith('hunter2'))
  })
})
