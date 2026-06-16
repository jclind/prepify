/**
 * Admin Reports queue — bulk select + bulk resolve/dismiss. The ReportAPI and
 * toast are mocked; react-query/router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Reports from 'src/pages/Admin/Reports/Reports'
import ReportAPI from 'src/api/reports'
import AdminAPI from 'src/api/admin'

vi.mock('src/api/reports', () => ({
  __esModule: true,
  default: {
    listReports: vi.fn(),
    resolveReport: vi.fn(),
    bulkResolve: vi.fn().mockResolvedValue({ updated: 2 }),
    setRecipeModeration: vi.fn(),
    setReviewModeration: vi.fn(),
  },
}))
vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: { approveRecipe: vi.fn().mockResolvedValue({ _id: 'rec1', status: 'active' }) },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedList = ReportAPI.listReports as unknown as Mock
const mockedBulk = ReportAPI.bulkResolve as unknown as Mock
const mockedApprove = AdminAPI.approveRecipe as unknown as Mock

const openReport = (id: string, recipeId: string) => ({
  _id: id,
  targetType: 'recipe' as const,
  recipeId,
  reporterUid: 'u1',
  reason: 'spam',
  status: 'open' as const,
  createdAt: new Date('2026-06-01').toISOString(),
  target: { recipe: { title: `Dish ${id}`, recipeImage: '', status: 'active' }, review: null },
})

// An auto-held report: open automod report whose target recipe is pending_review.
const heldReport = (id: string, recipeId: string) => ({
  ...openReport(id, recipeId),
  source: 'automod' as const,
  target: { recipe: { title: `Dish ${id}`, recipeImage: '', status: 'pending_review' }, review: null },
})

const renderReports = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Reports bulk actions', () => {
  it('selects all open reports and bulk-resolves them', async () => {
    mockedList.mockResolvedValue({
      reports: [openReport('r1', 'rec1'), openReport('r2', 'rec2')],
      totalCount: 2,
      openCount: 2,
    })
    renderReports()
    await screen.findByText('Dish r1')

    // "Select all 2 open" toggle in the bulk bar.
    fireEvent.click(screen.getByText(/select all 2 open/i))
    expect(await screen.findByText(/2 selected/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resolve selected/i }))

    await waitFor(() => expect(mockedBulk).toHaveBeenCalledTimes(1))
    const [ids, status] = mockedBulk.mock.calls[0]
    expect(ids.sort()).toEqual(['r1', 'r2'])
    expect(status).toBe('resolved')
  })

  it('does not show the bulk bar when there are no open reports', async () => {
    mockedList.mockResolvedValue({
      reports: [{ ...openReport('r1', 'rec1'), status: 'resolved' as const }],
      totalCount: 1,
      openCount: 0,
    })
    renderReports()
    await screen.findByText('Dish r1')
    expect(screen.queryByText(/select all/i)).not.toBeInTheDocument()
  })

  it('flags an automod report with the Automod pill + the classifier reason', async () => {
    mockedList.mockResolvedValue({
      reports: [
        {
          ...openReport('r1', 'rec1'),
          source: 'automod',
          classifier: {
            severity: 'medium',
            category: 'harassment',
            reason: 'openai:harassment:0.60',
            source: 'openai',
          },
        },
      ],
      totalCount: 1,
      openCount: 1,
    })
    renderReports()
    await screen.findByText('Dish r1')

    expect(screen.getByText('Automod')).toBeInTheDocument()
    expect(
      screen.getByText(/auto-flagged: harassment · 60% confidence · medium severity/i)
    ).toBeInTheDocument()
  })

  it('shows no Automod pill or classifier line for a plain user report', async () => {
    mockedList.mockResolvedValue({
      reports: [openReport('r1', 'rec1')], // no source / classifier
      totalCount: 1,
      openCount: 1,
    })
    renderReports()
    await screen.findByText('Dish r1')

    expect(screen.queryByText('Automod')).not.toBeInTheDocument()
    expect(screen.queryByText(/auto-flagged/i)).not.toBeInTheDocument()
  })

  it('approves an auto-held recipe straight from the queue (publishes + clears the report)', async () => {
    mockedList.mockResolvedValue({
      reports: [heldReport('h1', 'rec1')],
      totalCount: 1,
      openCount: 1,
    })
    renderReports()
    await screen.findByText('Dish h1')

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }))
    await waitFor(() => expect(mockedApprove).toHaveBeenCalledWith('rec1'))
  })

  it('keeps an auto-held report out of bulk select (a bulk dismiss must not strand it)', async () => {
    mockedList.mockResolvedValue({
      reports: [heldReport('h1', 'rec1'), openReport('r2', 'rec2')],
      totalCount: 2,
      openCount: 2,
    })
    renderReports()
    await screen.findByText('Dish h1')

    // Only the plain open report is selectable, so the bulk bar counts 1, not 2.
    expect(screen.getByText(/select all 1 open/i)).toBeInTheDocument()
    // The held report offers Approve, never a bare Dismiss.
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
  })
})
