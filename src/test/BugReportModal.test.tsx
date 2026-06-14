/**
 * BugReportModal: the global "Report a bug" affordance. useAuth and the bug
 * report API are mocked so we can verify (a) it renders the trigger for everyone
 * (logged-out included), (b) a submission posts through the API with the
 * auto-captured context, and (c) the optional email field shows only when logged
 * out.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BugReportModal from 'src/Components/BugReport/BugReportModal'
import { useAuth } from 'src/context/AuthContext'
import BugReportAPI from 'src/api/bugReports'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('src/api/bugReports', () => ({
  __esModule: true,
  default: { createBugReport: vi.fn().mockResolvedValue({ _id: 'bug1' }) },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedUseAuth = useAuth as unknown as Mock
const mockedCreate = BugReportAPI.createBugReport as unknown as Mock

afterEach(() => vi.clearAllMocks())

describe('BugReportModal', () => {
  it('renders the trigger even for logged-out users', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    render(<BugReportModal />)
    expect(screen.getByRole('button', { name: /report a bug/i })).toBeInTheDocument()
  })

  it('submits a report with auto-captured url and app version', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(<BugReportModal />)

    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    fireEvent.change(screen.getByPlaceholderText(/what went wrong/i), {
      target: { value: 'Save button does nothing' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1))
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'bug',
        description: 'Save button does nothing',
        url: expect.any(String),
        appVersion: expect.any(String),
      })
    )
  })

  it('blocks an empty submission', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(<BugReportModal />)
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('shows the optional email field only when logged out', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    const { rerender } = render(<BugReportModal />)
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    expect(screen.getByPlaceholderText(/follow up/i)).toBeInTheDocument()

    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    rerender(<BugReportModal />)
    expect(screen.queryByPlaceholderText(/follow up/i)).not.toBeInTheDocument()
  })

  it('shows "Reporting as <name>" for a signed-in user and not when logged out', () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1', displayName: 'chefSam' } })
    const { rerender } = render(<BugReportModal />)
    fireEvent.click(screen.getByRole('button', { name: /report a bug/i }))
    expect(screen.getByText(/reporting as/i)).toBeInTheDocument()
    expect(screen.getByText('chefSam')).toBeInTheDocument()

    vi.clearAllMocks()
    mockedUseAuth.mockReturnValue({ user: null })
    rerender(<BugReportModal />)
    expect(screen.queryByText(/reporting as/i)).not.toBeInTheDocument()
  })
})
