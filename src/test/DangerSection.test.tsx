import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import toast from 'react-hot-toast'
import DangerSection from 'src/pages/Settings/sections/DangerSection'
import AuthAPI from 'src/api/auth'
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
const mockExportMyData = AuthAPI.exportMyData as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>

const modalDeleteButton = () =>
  // After the modal opens there are two "Delete account" buttons — the card
  // trigger and the modal's confirm button. The modal's is the last one.
  screen.getAllByRole('button', { name: /delete account/i }).slice(-1)[0]

const openModal = () =>
  fireEvent.click(screen.getByRole('button', { name: /delete account/i }))

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

describe('Danger Zone — delete account gate (Google account)', () => {
  beforeEach(() => {
    mockDeleteAccount.mockClear()
    mockUseAuth.mockReturnValue({
      user: { providerData: [{ providerId: 'google.com' }] },
      deleteAccount: mockDeleteAccount,
    })
  })

  it('asks for no password and enables on the confirmation word alone', () => {
    render(<DangerSection />)
    openModal()

    expect(screen.queryByLabelText('Your password')).not.toBeInTheDocument()
    expect(modalDeleteButton()).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    expect(modalDeleteButton()).toBeEnabled()
  })

  it('deletes via popup reauth (no password argument)', async () => {
    render(<DangerSection />)
    openModal()
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(modalDeleteButton())

    await waitFor(() =>
      expect(mockDeleteAccount).toHaveBeenCalledWith(undefined)
    )
  })
})

describe('Danger Zone — delete error mapping', () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset()
    mockToastError.mockClear()
    mockUseAuth.mockReturnValue({
      user: { providerData: [{ providerId: 'password' }] },
      deleteAccount: mockDeleteAccount,
    })
  })

  const confirmAndDelete = () => {
    render(<DangerSection />)
    openModal()
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    fireEvent.change(screen.getByLabelText('Your password'), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(modalDeleteButton())
  }

  it('maps a wrong password to a friendly toast', async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/wrong-password' })
    )
    confirmAndDelete()
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Password incorrect, please try again.'
      )
    )
  })

  it('maps a cancelled reauth popup to a friendly toast', async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'auth/popup-closed-by-user' })
    )
    confirmAndDelete()
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Reauthentication was cancelled.'
      )
    )
  })

  it('surfaces the message for a password-required error', async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      Object.assign(new Error('Password Is Required'), {
        code: 'password-required',
      })
    )
    confirmAndDelete()
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Password Is Required')
    )
  })

  it('falls back to a generic toast for an unknown error', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('boom'))
    confirmAndDelete()
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('boom'))
  })
})

describe('Danger Zone — export data', () => {
  beforeEach(() => {
    mockExportMyData.mockReset()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    mockUseAuth.mockReturnValue({
      user: { providerData: [{ providerId: 'password' }] },
      deleteAccount: mockDeleteAccount,
    })
  })

  it('triggers the export and confirms via toast', async () => {
    mockExportMyData.mockResolvedValueOnce(undefined)
    render(<DangerSection />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => expect(mockExportMyData).toHaveBeenCalled())
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled())
  })

  it('shows an error toast when the export fails', async () => {
    mockExportMyData.mockRejectedValueOnce(new Error('export failed'))
    render(<DangerSection />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('export failed')
    )
  })
})

describe('Danger Zone — confirm modal mechanics', () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset()
    mockUseAuth.mockReturnValue({
      user: { providerData: [{ providerId: 'password' }] },
      deleteAccount: mockDeleteAccount,
    })
  })

  it('closes on Escape', () => {
    render(<DangerSection />)
    openModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when the backdrop is clicked but not the panel', () => {
    const { container } = render(<DangerSection />)
    openModal()

    // Clicking the panel itself must not dismiss.
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Clicking the scrim behind it dismisses.
    fireEvent.mouseDown(container.querySelector('.sr-modal-scrim')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('locks background scroll while open and restores it on close', () => {
    render(<DangerSection />)
    openModal()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(document.body.style.overflow).toBe('')
  })

  it('does not close while a deletion is in flight', async () => {
    // A never-resolving delete keeps the section in its "deleting" state.
    mockDeleteAccount.mockReturnValue(new Promise(() => {}))
    render(<DangerSection />)
    openModal()
    fireEvent.change(screen.getByLabelText(/type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    })
    fireEvent.change(screen.getByLabelText('Your password'), {
      target: { value: 'hunter2' },
    })
    fireEvent.click(modalDeleteButton())

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled())

    // Escape is ignored mid-delete, and Cancel is disabled.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })
})
