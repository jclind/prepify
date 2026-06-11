/**
 * ReportControl: the user-facing report affordance. useAuth and the reports API
 * are mocked so we can verify (a) it renders nothing for logged-out users, and
 * (b) a logged-in user can open the modal and submit a report through the API.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReportControl from 'src/Components/ReportControl/ReportControl'
import { useAuth } from 'src/context/AuthContext'
import ReportAPI from 'src/api/reports'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('src/api/reports', () => ({
  __esModule: true,
  default: { createReport: vi.fn().mockResolvedValue({ _id: 'rep1' }) },
  ALREADY_REPORTED_CODE: 'ALREADY_REPORTED',
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedUseAuth = useAuth as unknown as Mock
const mockedCreate = ReportAPI.createReport as unknown as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('ReportControl', () => {
  it('renders nothing when the user is logged out', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    const { container } = render(
      <ReportControl target={{ targetType: 'recipe', recipeId: 'r1' }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lets a logged-in user open the modal and submit a recipe report', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(<ReportControl target={{ targetType: 'recipe', recipeId: 'r1' }} />)

    fireEvent.click(screen.getByRole('button', { name: /report this recipe/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1))
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'recipe', recipeId: 'r1', reason: 'spam' })
    )
  })

  it('passes reportedUsername through for a review report', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(
      <ReportControl
        target={{ targetType: 'review', recipeId: 'r1', reportedUsername: 'baduser' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /report this review/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1))
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'review', reportedUsername: 'baduser' })
    )
  })
})
