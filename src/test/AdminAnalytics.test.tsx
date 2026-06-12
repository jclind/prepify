/**
 * Admin Analytics (Overview) page: renders headline totals + recent actions from
 * AdminAPI.getAnalytics, and refetches when the day-range toggle changes. The API
 * is mocked; react-query/router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Analytics from 'src/pages/Admin/Analytics/Analytics'
import AdminAPI from 'src/api/admin'

vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: { getAnalytics: vi.fn() },
}))

const mockedGet = AdminAPI.getAnalytics as unknown as Mock

const series = (...counts: number[]) =>
  counts.map((count, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, count }))

const sample = {
  days: 30,
  totals: {
    users: 42,
    recipes: { total: 100, active: 90, hidden: 5, unpublished: 5, featured: 3 },
    reviews: 17,
    reports: { open: 4, resolved: 8, dismissed: 2 },
  },
  reportsOverTime: series(1, 0, 2),
  recipesOverTime: series(3, 1, 0),
  usersOverTime: series(0, 1, 1),
  recentActions: [
    {
      _id: 'a1',
      action: 'report.resolve' as const,
      actorUid: 'admin-uid',
      actorUsername: 'mod',
      targetType: 'report' as const,
      targetId: 'rep1',
      targetLabel: '@alice',
      reason: null,
      metadata: null,
      createdAt: new Date('2026-06-03T12:00:00Z').toISOString(),
    },
  ],
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Analytics page', () => {
  it('renders headline totals and a recent action', async () => {
    mockedGet.mockResolvedValue(sample)
    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument() // users
    expect(screen.getByText('100')).toBeInTheDocument() // recipes total
    expect(screen.getByText('17')).toBeInTheDocument() // reviews
    expect(screen.getByText('4')).toBeInTheDocument() // open reports
    expect(screen.getByText(/3 featured/)).toBeInTheDocument()

    // Recent action row reuses the audit phrasing.
    expect(screen.getByText('@mod')).toBeInTheDocument()
    expect(screen.getByText(/resolved report/)).toBeInTheDocument()
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  it('refetches when the day-range toggle changes', async () => {
    mockedGet.mockResolvedValue(sample)
    renderPage()
    await screen.findByText('42')
    expect(mockedGet).toHaveBeenCalledWith({ days: 30 })

    fireEvent.click(screen.getByRole('button', { name: '7d' }))

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith({ days: 7 }))
  })

  it('shows an error state when the request fails', async () => {
    mockedGet.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/failed to load analytics/i)).toBeInTheDocument()
  })
})
