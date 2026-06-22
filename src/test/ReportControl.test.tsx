/**
 * ReportControl: the user-facing report affordance. useAuth, the reports API,
 * and toast are mocked so we can verify (a) the trigger stays visible to
 * logged-out users and clicking it prompts them to log in (rather than opening
 * the modal), and (b) a logged-in user can open the modal and submit a report
 * (recipe / review / user) through the API.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReportControl from 'src/Components/ReportControl/ReportControl'
import { useAuth } from 'src/context/AuthContext'
import ReportAPI from 'src/api/reports'
import toast from 'react-hot-toast'

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
const mockedToastError = toast.error as unknown as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('ReportControl', () => {
  it('keeps the trigger visible but prompts login when logged out', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    render(<ReportControl target={{ targetType: 'recipe', recipeId: 'r1' }} />)

    // The trigger is shown so a logged-out visitor still knows reporting exists.
    const trigger = screen.getByRole('button', { name: /report this recipe/i })
    fireEvent.click(trigger)

    // Clicking nudges to log in instead of opening the report modal.
    expect(mockedToastError).toHaveBeenCalledTimes(1)
    expect(mockedToastError).toHaveBeenCalledWith(expect.stringMatching(/log in/i))
    expect(
      screen.queryByRole('heading', { name: /report this recipe/i })
    ).not.toBeInTheDocument()
    expect(mockedCreate).not.toHaveBeenCalled()
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

  it('menu variant: opens a kebab dropdown whose item opens the report modal', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(
      <ReportControl
        variant='menu'
        target={{ targetType: 'review', recipeId: 'r1', reportedUsername: 'baduser' }}
      />
    )

    // The report item is hidden until the kebab is opened.
    expect(
      screen.queryByRole('menuitem', { name: /report this review/i })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    const item = screen.getByRole('menuitem', { name: /report this review/i })
    fireEvent.click(item)

    // The modal opens; submitting reports the review.
    expect(
      screen.getByRole('heading', { name: /report this review/i })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }))
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1))
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'review', reportedUsername: 'baduser' })
    )
  })

  it('menu variant: prompts login when logged out', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    render(
      <ReportControl
        variant='menu'
        target={{ targetType: 'user', reportedUsername: 'baduser' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /report this user/i }))

    expect(mockedToastError).toHaveBeenCalledWith(expect.stringMatching(/log in/i))
    expect(
      screen.queryByRole('heading', { name: /report this user/i })
    ).not.toBeInTheDocument()
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('lets a logged-in user report another user (no recipeId)', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    render(
      <ReportControl
        target={{ targetType: 'user', reportedUsername: 'baduser' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /report this user/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1))
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'user', reportedUsername: 'baduser' })
    )
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ recipeId: expect.anything() })
    )
  })
})
