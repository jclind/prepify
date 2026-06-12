/**
 * Admin Audit page: renders enriched audit entries and filters them through
 * AdminAPI.listAudit. The API is mocked; react-query/router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Audit from 'src/pages/Admin/Audit/Audit'
import AdminAPI from 'src/api/admin'

vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: { listAudit: vi.fn() },
}))

const mockedList = AdminAPI.listAudit as unknown as Mock

const sampleEntry = {
  _id: 'a1',
  action: 'user.ban' as const,
  actorUid: 'admin-uid',
  actorUsername: 'mod',
  targetType: 'user' as const,
  targetId: 'u9',
  targetLabel: '@baduser',
  reason: 'repeated abuse',
  metadata: null,
  createdAt: new Date('2026-06-01T12:00:00Z').toISOString(),
}

const renderAudit = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Audit />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Audit page', () => {
  it('renders an audit entry with actor, action phrasing, target and reason', async () => {
    mockedList.mockResolvedValue({ entries: [sampleEntry], totalCount: 1 })
    renderAudit()

    expect(await screen.findByText('@mod')).toBeInTheDocument()
    // The row label ("… banned …") — scoped to the audit line so it doesn't
    // collide with the "User banned" option in the filter dropdown.
    expect(screen.getByText(/banned/, { selector: '.audit-line' })).toBeInTheDocument()
    expect(screen.getByText('@baduser')).toBeInTheDocument()
    expect(screen.getByText(/repeated abuse/)).toBeInTheDocument()
  })

  it('filters by target type and refetches', async () => {
    mockedList.mockResolvedValue({ entries: [sampleEntry], totalCount: 1 })
    renderAudit()
    await screen.findByText('@mod')

    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'report', page: 1 })
      )
    )
  })

  it('shows an empty state when there are no entries', async () => {
    mockedList.mockResolvedValue({ entries: [], totalCount: 0 })
    renderAudit()
    expect(await screen.findByText(/no matching audit entries/i)).toBeInTheDocument()
  })
})
