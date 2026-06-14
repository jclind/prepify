/**
 * Admin Bug Reports queue — rendering, reporter enrichment, and bulk
 * resolve/dismiss. The BugReportAPI and toast are mocked; react-query/router
 * are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BugReports from 'src/pages/Admin/BugReports/BugReports'
import BugReportAPI from 'src/api/bugReports'

vi.mock('src/api/bugReports', () => ({
  __esModule: true,
  default: {
    listBugReports: vi.fn(),
    resolveBugReport: vi.fn(),
    bulkResolve: vi.fn().mockResolvedValue({ updated: 2 }),
  },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedList = BugReportAPI.listBugReports as unknown as Mock
const mockedBulk = BugReportAPI.bulkResolve as unknown as Mock

const openReport = (id: string, overrides = {}) => ({
  _id: id,
  reporterUid: 'u1',
  reporterEmail: null,
  reporterUsername: 'reporterUser',
  category: 'bug' as const,
  description: `Issue ${id}`,
  url: '/recipes/abc',
  userAgent: 'jest-agent',
  appVersion: '2.6.3',
  status: 'open' as const,
  createdAt: new Date('2026-06-01').toISOString(),
  ...overrides,
})

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <BugReports />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Bug Reports', () => {
  it('renders reports with reporter and context', async () => {
    mockedList.mockResolvedValue({
      reports: [openReport('b1')],
      totalCount: 1,
      openCount: 1,
    })
    renderPage()
    await screen.findByText('Issue b1')
    expect(screen.getByText('@reporterUser')).toBeInTheDocument()
    expect(screen.getByText('/recipes/abc')).toBeInTheDocument()
  })

  it('selects all open reports and bulk-dismisses them', async () => {
    mockedList.mockResolvedValue({
      reports: [openReport('b1'), openReport('b2')],
      totalCount: 2,
      openCount: 2,
    })
    renderPage()
    await screen.findByText('Issue b1')

    fireEvent.click(screen.getByText(/select all 2 open/i))
    expect(await screen.findByText(/2 selected/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss selected/i }))

    await waitFor(() => expect(mockedBulk).toHaveBeenCalledTimes(1))
    const [ids, status] = mockedBulk.mock.calls[0]
    expect(ids.sort()).toEqual(['b1', 'b2'])
    expect(status).toBe('dismissed')
  })

  it('falls back to Anonymous when there is no reporter', async () => {
    mockedList.mockResolvedValue({
      reports: [
        openReport('b1', { reporterUid: null, reporterUsername: null, reporterEmail: null }),
      ],
      totalCount: 1,
      openCount: 1,
    })
    renderPage()
    await screen.findByText('Issue b1')
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })
})
