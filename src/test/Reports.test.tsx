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
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedList = ReportAPI.listReports as unknown as Mock
const mockedBulk = ReportAPI.bulkResolve as unknown as Mock

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
})
