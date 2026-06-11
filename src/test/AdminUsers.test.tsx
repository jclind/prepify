/**
 * Admin Users page: renders enriched search results and applies a status change
 * through AdminAPI. The API + toast are mocked; react-query/router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Users from 'src/pages/Admin/Users/Users'
import AdminAPI from 'src/api/admin'

vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: {
    searchUsers: vi.fn(),
    setUserStatus: vi.fn().mockResolvedValue({ uid: 'u1', status: 'suspended' }),
  },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockedSearch = AdminAPI.searchUsers as unknown as Mock
const mockedSetStatus = AdminAPI.setUserStatus as unknown as Mock

const sampleUser = {
  uid: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  status: 'active' as const,
  statusReason: null,
  statusUpdatedAt: null,
  statusUpdatedBy: null,
  counts: { recipes: 2, reviews: 3, openReports: 1 },
}

const renderUsers = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Users page', () => {
  it('renders enriched user rows from the search', async () => {
    mockedSearch.mockResolvedValue({ users: [sampleUser], totalCount: 1 })
    renderUsers()

    expect(await screen.findByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText(/2 recipes/)).toBeInTheDocument()
    expect(screen.getByText(/1 open reports/)).toBeInTheDocument()
  })

  it('applies a status change through AdminAPI', async () => {
    mockedSearch.mockResolvedValue({ users: [sampleUser], totalCount: 1 })
    renderUsers()
    await screen.findByText('@alice')

    fireEvent.change(screen.getByLabelText(/status for alice/i), {
      target: { value: 'suspended' },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(mockedSetStatus).toHaveBeenCalledTimes(1))
    expect(mockedSetStatus).toHaveBeenCalledWith('u1', 'suspended', '')
  })

  it('shows an empty state when no users match', async () => {
    mockedSearch.mockResolvedValue({ users: [], totalCount: 0 })
    renderUsers()
    expect(await screen.findByText(/no users found/i)).toBeInTheDocument()
  })
})
